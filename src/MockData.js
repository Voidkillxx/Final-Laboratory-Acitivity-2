export const generateMockProducts = (count = 100) => {
    const products = [];
    // Define categories for food products
    const adjectives = ['Organic', 'Fresh', 'Frozen', 'Spicy', 'Gourmet', 'Aged', 'Seasonal', 'Imported'];
    const nouns = ['Salsa', 'Pasta', 'Coffee Beans', 'Cheese', 'Muffins', 'Ketchup', 'Olive Oil', 'Soup Mix'];

    for (let i = 1; i <= count; i++) {
        const name = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
        const currentInventory = Math.floor(Math.random() * 500) + 10;
        const avgSalesPerWeek = Math.floor(Math.random() * 80) + 5;
        const daysToReplenish = Math.floor(Math.random() * 20) + 3;

        // Populate the product data structure
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