export const generateMockProducts = (count = 100) => {
    const products = [];
    const adjectives = ['Electric', 'Manual', 'Industrial', 'Compact', 'Heavy-Duty', 'Smart', 'Wireless', 'Ergonomic'];
    const nouns = ['Widget', 'Filter', 'Valve', 'Sensor', 'Monitor', 'Drill', 'Charger', 'Cutter'];

    for (let i = 1; i <= count; i++) {
        const name = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]} #${i}`;
        const currentInventory = Math.floor(Math.random() * 500) + 10;
        const avgSalesPerWeek = Math.floor(Math.random() * 80) + 5;
        const daysToReplenish = Math.floor(Math.random() * 20) + 3;

        products.push({
            id: i,
            productName: name,
            currentInventory,
            avgSalesPerWeek,
            daysToReplenish,
        });
    }

    return products;
};

export const calculateReorderStatus = (product) => {
    const avgSalesPerDay = product.avgSalesPerWeek / 7;
    const safetyStockDays = 2; 
    const effectiveLeadTime = product.daysToReplenish + safetyStockDays;
    const reorderPoint = avgSalesPerDay * effectiveLeadTime;

    const daysOfSupply = avgSalesPerDay > 0 
        ? product.currentInventory / avgSalesPerDay 
        : Infinity;

    const needsReorder = product.currentInventory < reorderPoint;

    return {
        ...product,
        avgSalesPerDay: avgSalesPerDay.toFixed(2),
        reorderPoint: Math.ceil(reorderPoint),
        daysOfSupply: daysOfSupply === Infinity ? 'N/A' : daysOfSupply.toFixed(1),
        needsReorder,
    };
};