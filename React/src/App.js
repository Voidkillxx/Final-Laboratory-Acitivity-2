import React, { useState, useEffect, useMemo } from 'react';
import { generateClassificationData, trainClassifierModel, runPrediction } from './TFModelUtils';
import './App.css';

function App() {
    // --- State Initialization ---
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchingData, setFetchingData] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showOnlyReorder, setShowOnlyReorder] = useState(false);
    
    // ML Model State
    const [classifierModel, setClassifierModel] = useState(null);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const ITEMS_PER_PAGE = 20;

    // --- 1. Train ML Model 
    useEffect(() => {
        const initModel = async () => {
            try {
                const { trainingData, outputData } = generateClassificationData();
                const trainedModel = await trainClassifierModel(trainingData, outputData);
                setClassifierModel(trainedModel);
                
                trainingData.dispose();
                outputData.dispose();
            } catch (err) {
                console.error("Model training failed", err);
            }
        };
        initModel();
    }, []);

    // --- 2. Fetch Data from API
    useEffect(() => {
        const fetchData = async () => {
            if (!classifierModel) return;

            setFetchingData(true);
            try {
                const response = await fetch(`http://localhost:8100/api/products?page=${currentPage}&per_page=${ITEMS_PER_PAGE}`);
                
                if (!response.ok) throw new Error('API Error');

                const jsonResponse = await response.json();
                
                // Handle Laravel Resource response structure
                const dbData = jsonResponse.data || jsonResponse;
                const meta = jsonResponse.meta || {};

                // Update Pagination
                setLastPage(meta.last_page || 1);
                setTotalItems(meta.total || dbData.length);

                // Map Database Fields
                const formattedData = dbData.map(item => ({
                    id: item.id,
                    productName: item.productName || item.product_name,
                    currentInventory: item.currentInventory || item.current_inventory,
                    avgSalesPerWeek: Math.round(parseFloat(item.avgSalesPerWeek || item.avg_sales_per_week)),
                    daysToReplenish: Math.round(parseFloat(item.daysToReplenish || item.days_to_replenish)),
                }));

                // Run Predictions
                const predictedProductsPromises = formattedData.map(async product => {
                    const predictionScore = await runPrediction(classifierModel, product);
                    const needsReorder = predictionScore > 0.5;

                    return {
                        ...product,
                        predictionScore: predictionScore.toFixed(3),
                        needsReorder,
                        daysOfSupply: Math.round((product.currentInventory / (product.avgSalesPerWeek / 7)).toFixed(1))
                    };
                });
                
                const finalProducts = await Promise.all(predictedProductsPromises);
                setProducts(finalProducts);

            } catch (error) {
                console.error("Fetch error:", error);
            } finally {
                setLoading(false);
                setFetchingData(false);
            }
        };

        fetchData();
    }, [classifierModel, currentPage]);

    // --- Filter Logic ---
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

        return filtered.sort((a, b) => {
            if (a.needsReorder && !b.needsReorder) return -1;
            if (!a.needsReorder && b.needsReorder) return 1;
            return parseFloat(b.predictionScore) - parseFloat(a.predictionScore);
        });
    }, [products, showOnlyReorder, searchTerm]);

    const reorderCount = products.filter(p => p.needsReorder).length;

    const handlePrev = () => {
        if (currentPage > 1) setCurrentPage(prev => prev - 1);
    };

    const handleNext = () => {
        if (currentPage < lastPage) setCurrentPage(prev => prev + 1);
    };

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
                <h1>ML-Powered Inventory Dashboard</h1>
                <p>Total Products: {totalItems} | Urgent Reorders: {reorderCount}</p>
            </header>

            <div className="controls-bar">
                <input
                    type="text"
                    placeholder="Search visible products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
                <label className="checkbox-label">
                    <input
                        type="checkbox"
                        checked={showOnlyReorder}
                        onChange={() => setShowOnlyReorder(!showOnlyReorder)}
                    />
                    Show Only Reorder Suggestions
                </label>
            </div>

            <main className="product-table-wrapper">
                {fetchingData ? (
                    <div className="table-loading-overlay">Loading Page Data...</div>
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
                                            {product.needsReorder 
                                                ? 'URGENT - Reorder Required' : 'OK - Sufficient Stock'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="no-results">
                                        No products found on this page.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}

                <div className="pagination-controls">
                    <button 
                        className="page-btn" 
                        onClick={handlePrev} 
                        disabled={currentPage === 1 || fetchingData}
                    >
                        &laquo; Previous
                    </button>
                    
                    <span className="page-info">
                        Page <strong>{currentPage}</strong> of <strong>{lastPage}</strong>
                    </span>
                    
                    <button 
                        className="page-btn" 
                        onClick={handleNext} 
                        disabled={currentPage === lastPage || fetchingData}
                    >
                        Next &raquo;
                    </button>
                </div>
            </main>
        </div>
    );
}

export default App;