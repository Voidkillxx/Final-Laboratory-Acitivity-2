import React, { useState, useEffect, useMemo } from 'react';
import { generateClassificationData, trainClassifierModel, runPrediction } from './TFModelUtils';
import './App.css';

function App() {
    // --- State Initialization ---
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true); // App Loading
    const [fetchingData, setFetchingData] = useState(false); // Table Loading
    
    // System Status State
    const [systemStatus, setSystemStatus] = useState('Waiting for Analysis');
    const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [showOnlyReorder, setShowOnlyReorder] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const ITEMS_PER_PAGE = 20;

    // --- 1. Initial Data Fetch (Raw Data Only) ---
    useEffect(() => {
        const fetchRawData = async () => {
            setFetchingData(true);
            try {
                // Fetch from Laravel API
                const response = await fetch(`http://localhost:8100/api/products?page=${currentPage}&per_page=${ITEMS_PER_PAGE}`);
                if (!response.ok) throw new Error('API Error');

                const jsonResponse = await response.json();
                const dbData = jsonResponse.data || jsonResponse;
                const meta = jsonResponse.meta || {};

                setLastPage(meta.last_page || 1);
                setTotalItems(meta.total || dbData.length);

                // Map fields but DO NOT PREDICT yet
                const formattedData = dbData.map(item => ({
                    id: item.id,
                    productName: item.productName || item.product_name,
                    currentInventory: item.currentInventory || item.current_inventory,
                    avgSalesPerWeek: Math.round(parseFloat(item.avgSalesPerWeek || item.avg_sales_per_week)),
                    daysToReplenish: Math.round(parseFloat(item.daysToReplenish || item.days_to_replenish)),
                    // Default values before analysis
                    predictionScore: null,
                    needsReorder: false,
                    daysOfSupply: Math.round((item.currentInventory || item.current_inventory) / ((item.avgSalesPerWeek || item.avg_sales_per_week) / 7))
                }));

                setProducts(formattedData);
                
                // Reset status if page changes
                setSystemStatus('Waiting for Analysis'); 
                setIsAnalysisComplete(false);

            } catch (error) {
                console.error("Fetch error:", error);
            } finally {
                setLoading(false);
                setFetchingData(false);
            }
        };

        fetchRawData();
    }, [currentPage]);

    // --- 2. Handle Analysis Button Click ---
    const handleRunAnalysis = async () => {
        setSystemStatus('Initializing Neural Network...');
        setFetchingData(true); // Show loading on table

        try {
            // A. Train Model (Client Side)
            setSystemStatus('Training Model...');
            const { trainingData, outputData } = generateClassificationData();
            const trainedModel = await trainClassifierModel(trainingData, outputData); // Trains the model
            
            // Cleanup training tensors
            trainingData.dispose();
            outputData.dispose();

            setSystemStatus('Running Predictions...');
            
            const analyzedProductsPromises = products.map(async product => {
                const predictionScore = await runPrediction(trainedModel, product);
                const needsReorder = predictionScore > 0.5;

                return {
                    ...product,
                    predictionScore: predictionScore.toFixed(3),
                    needsReorder: needsReorder,
                };
            });

            const finalAnalyzedProducts = await Promise.all(analyzedProductsPromises);
            
            setProducts(finalAnalyzedProducts);
            setSystemStatus('Analysis Complete');
            setIsAnalysisComplete(true);

        } catch (error) {
            console.error(error);
            setSystemStatus('Analysis Failed');
        } finally {
            setFetchingData(false);
        }
    };

    // --- Filter and Sort Logic ---
    const filteredProducts = useMemo(() => {
        let filtered = products;

        if (showOnlyReorder) {
            filtered = filtered.filter(p => p.needsReorder);
        }

        if (searchTerm) {
            const lowerCaseSearch = searchTerm.toLowerCase();
            filtered = filtered.filter(p => 
                p.productName.toLowerCase().includes(lowerCaseSearch)
            );
        }

        // Only sort by Urgency IF analysis is complete
        if (isAnalysisComplete) {
            return filtered.sort((a, b) => {
                if (a.needsReorder && !b.needsReorder) return -1;
                if (!a.needsReorder && b.needsReorder) return 1;
                return parseFloat(b.predictionScore) - parseFloat(a.predictionScore);
            });
        }
        
        return filtered; // Return default order if analysis not run
    }, [products, showOnlyReorder, searchTerm, isAnalysisComplete]);

    const reorderCount = products.filter(p => p.needsReorder).length;

    // --- Pagination Handlers ---
    const handlePrev = () => { if (currentPage > 1) setCurrentPage(prev => prev - 1); };
    const handleNext = () => { if (currentPage < lastPage) setCurrentPage(prev => prev + 1); };

    if (loading) {
        return (
            <div className="dashboard-container">
                <div className="loading-state">
                    <h2>Loading...</h2>
               </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Dashboard</h1>
                
                {/* System Status Section */}
                <div className="status-container">
                    <span className="status-label">System Status</span>
                    <h2 className={`status-value ${isAnalysisComplete ? 'status-complete' : ''}`}>
                        {systemStatus}
                    </h2>
                </div>

                <div className="header-stats">
                    <p>Products: {products.length} | Urgent: {isAnalysisComplete ? reorderCount : '-'}</p>
                </div>
            </header>

            <div className="controls-bar">
                <div className="left-controls">
                    <button 
                        className="run-analysis-btn" 
                        onClick={handleRunAnalysis}
                        disabled={fetchingData || isAnalysisComplete}
                    >
                        {fetchingData ? 'Processing...' : 'Run Analysis'}
                    </button>
                    
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
                
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        checked={showOnlyReorder}
                        onChange={() => setShowOnlyReorder(!showOnlyReorder)}
                        disabled={!isAnalysisComplete} // Disable filter if no analysis
                    />
                    Show Only Reorder Suggestions
                </label>
            </div>

            <main className="product-table-wrapper">
                {fetchingData ? (
                    <div className="table-loading-overlay">
                        <p>{systemStatus}...</p>
                                            </div>
                ) : (
                    <table className="unique-table">
                        <thead>
                            <tr>
                                <th>Product Name</th>
                                <th>Inventory (QTY)</th>
                                <th>Sales/Week</th>
                                <th>Lead Time (Days)</th>
                                <th>Days of Supply</th>
                                <th className="suggestion-col">Reorder Suggestion</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.length > 0 ? (
                                filteredProducts.map(product => (
                                    <tr 
                                        key={product.id} 
                                        className={product.needsReorder ? 'needs-reorder' : ''}
                                    >
                                        <td>{product.productName}</td>
                                        <td className="data-highlight">{product.currentInventory}</td>
                                        <td>{product.avgSalesPerWeek}</td>
                                        <td>{product.daysToReplenish}</td>
                                        <td className="data-highlight">{product.daysOfSupply}</td>
                                        <td className="suggestion-col">
                                            {isAnalysisComplete ? (
                                                product.needsReorder 
                                                ? 'URGENT - Reorder Required' : 'OK - Sufficient Stock'
                                            ) : (
                                                <span className="pending-text">-- Pending Analysis --</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="no-results">
                                        No products found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}

                <div className="pagination-controls">
                    <button className="page-btn" onClick={handlePrev} disabled={currentPage === 1 || fetchingData}>
                        &laquo; Previous
                    </button>
                    <span className="page-info">Page <strong>{currentPage}</strong> of <strong>{lastPage}</strong></span>
                    <button className="page-btn" onClick={handleNext} disabled={currentPage === lastPage || fetchingData}>
                        Next &raquo;
                    </button>
                </div>
            </main>
        </div>
    );
}

export default App;