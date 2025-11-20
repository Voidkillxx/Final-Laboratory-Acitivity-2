import React, { useState, useEffect, useMemo } from 'react';
import { generateMockProducts } from './MockData';
import { generateClassificationData, trainClassifierModel, runPrediction } from './TFModelUtils';
import './App.css';

function App() {
    // State initialization for core dashboard data and flags
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showOnlyReorder, setShowOnlyReorder] = useState(false);
    const [classifierModel, setClassifierModel] = useState(null);

    useEffect(() => {
        const initializeModel = async () => {
            setLoading(true);

            // 1. Generate Training Data
            const { trainingData, outputData } = generateClassificationData();
            
            // 2. Train the Model (Operation runs silently in background)
            const trainedModel = await trainClassifierModel(trainingData, outputData);
            setClassifierModel(trainedModel);
            
            // Free up memory after training is complete
            trainingData.dispose();
            outputData.dispose();
            
            // 3. Get Products for Dashboard
            const rawData = generateMockProducts(120); 

            // 4. Run Batch Predictions on all products asynchronously
            const predictedProductsPromises = rawData.map(async product => {
                const predictionScore = await runPrediction(trainedModel, product);
                // Classification threshold: Predict reorder if score > 0.5
                const needsReorder = predictionScore > 0.5;

                return {
                    ...product,
                    predictionScore: predictionScore.toFixed(3),
                    needsReorder,
                    daysOfSupply: (product.currentInventory / (product.avgSalesPerWeek / 7)).toFixed(1)
                };
            });
            
            const predictedProducts = await Promise.all(predictedProductsPromises);
            
            setProducts(predictedProducts);
            setLoading(false);
        };

        initializeModel();
        // Effect runs only once on mount
    }, []); 

    // Memoize filtering and sorting for performance, triggered by state changes
    const filteredProducts = useMemo(() => {
        let filtered = products;

        // Apply Reorder filter
        if (showOnlyReorder) {
            filtered = filtered.filter(p => p.needsReorder);
        }

        // Apply Search filter
        if (searchTerm) {
            const lowerCaseSearch = searchTerm.toLowerCase();
            filtered = filtered.filter(p => 
                p.productName.toLowerCase().includes(lowerCaseSearch)
            );
        }

        // Sort: Reorder items first, then by urgency (highest prediction score)
        return filtered.sort((a, b) => {
            if (a.needsReorder && !b.needsReorder) return -1;
            if (!a.needsReorder && b.needsReorder) return 1;
            
            return parseFloat(b.predictionScore) - parseFloat(a.predictionScore);
        });
    }, [products, showOnlyReorder, searchTerm]);


    const reorderCount = products.filter(p => p.needsReorder).length;

    // Loading State UI during training and initial data fetch
    if (loading) {
        return (
            <div className="dashboard-container">
                <div className="loading-state">
                    <h2>Loading Inventory Data...</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Food Inventory Reorder Dashboard</h1>
                <p>Total Products: {products.length} | Urgent Reorders: {reorderCount}</p>
            </header>

            <div className="controls-bar">
                <input
                    type="text"
                    placeholder="Search by Product Name..."
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

            <main className="product-table-wrapper"> {/* Reverting to TABLE WRAPPER */}
                <table className="unique-table"> {/* NEW CLASS NAME for unique styling */}
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
                                    <td className="data-highlight">{product.currentInventory}</td> {/* Highlight data fields */}
                                    <td>{product.avgSalesPerWeek}</td>
                                    <td>{product.daysToReplenish}</td>
                                    <td className="data-highlight">{product.daysOfSupply}</td> {/* Highlight data fields */}
                                    <td className="suggestion-col">
                                        {product.needsReorder 
                                            ? 'URGENT - Reorder Required' : 'OK - Sufficient Stock'}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="no-results">
                                    No products match the current filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </main>
        </div>
    );
}

export default App;