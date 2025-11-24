import * as tf from '@tensorflow/tfjs';

const EPOCHS = 30;
const TRAINING_SAMPLES = 1000;

// Normalization Constants (Scales inputs to 0-1 range for stability)
const MAX_INVENTORY = 1000;
const MAX_SALES = 200;
const MAX_LEAD_TIME = 50;

export const generateClassificationData = () => {
    const xs = []; 
    const ys = [];

    for (let i = 0; i < TRAINING_SAMPLES; i++) {
        const inventory = Math.random() * 800;
        const avgSalesPerWeek = Math.random() * 100 + 5;
        const daysToReplenish = Math.random() * 20 + 3;

        const avgSalesPerDay = avgSalesPerWeek / 7;
        const reorderPoint = avgSalesPerDay * daysToReplenish * 1.5;
        const isReorderNeeded = inventory < reorderPoint ? 1 : 0;

        // Normalize inputs
        xs.push([
            inventory / MAX_INVENTORY, 
            avgSalesPerWeek / MAX_SALES, 
            daysToReplenish / MAX_LEAD_TIME
        ]);
        
        ys.push([isReorderNeeded]);
    }

    const trainingData = tf.tensor2d(xs);
    const outputData = tf.tensor2d(ys);

    return { trainingData, outputData };
};

export const trainClassifierModel = async (trainingData, outputData) => {
    const model = tf.sequential();
    
    // Model Architecture
    model.add(
        tf.layers.dense({ inputShape: [3], units: 12, activation: 'relu' })
    );

    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

    // Compilation
    model.compile({
        optimizer: tf.train.adam(0.01),
        loss: 'binaryCrossentropy',
        metrics: ['accuracy'],
    });

    // Training
    await model.fit(trainingData, outputData, {
        epochs: EPOCHS,
        shuffle: true,
    });

    return model;
};

export const runPrediction = async (model, product) => {
    // Normalize prediction input to match training data
    const newProductTensor = tf.tensor2d([
        [
            product.currentInventory / MAX_INVENTORY, 
            product.avgSalesPerWeek / MAX_SALES, 
            product.daysToReplenish / MAX_LEAD_TIME
        ]
    ]);
    
    const result = model.predict(newProductTensor);
    const value = (await result.data())[0];
    
    newProductTensor.dispose(); 
    
    return value;
};