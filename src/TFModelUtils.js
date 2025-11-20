import * as tf from '@tensorflow/tfjs';

const EPOCHS = 20;
const TRAINING_SAMPLES = 1000; // Number of synthetic samples to train the model

export const generateClassificationData = () => {
    const xs = []; // Input Features: [inventory, avgSalesPerWeek, daysToReplenish]
    const ys = []; // Output Label: [0] = No Reorder, [1] = Reorder

    for (let i = 0; i < TRAINING_SAMPLES; i++) {
        const inventory = Math.random() * 500;
        const avgSalesPerWeek = Math.random() * 80 + 5;
        const daysToReplenish = Math.random() * 20 + 3;

        const avgSalesPerDay = avgSalesPerWeek / 7;
        // Logic used to generate the correct 'y' label for training the classifier
        const reorderPoint = avgSalesPerDay * daysToReplenish * 1.5;

        const isReorderNeeded = inventory < reorderPoint ? 1 : 0;

        xs.push([inventory, avgSalesPerWeek, daysToReplenish]);
        ys.push([isReorderNeeded]);
    }

    // Convert JavaScript arrays into TensorFlow 2D Tensors
    const trainingData = tf.tensor2d(xs);
    const outputData = tf.tensor2d(ys);

    return { trainingData, outputData };
};

export const trainClassifierModel = async (trainingData, outputData) => {
    // Sequential model structure required by the guide
    const model = tf.sequential();
    
    // Hidden Layer: Takes 3 inputs and uses ReLU activation
    model.add(
        tf.layers.dense({ inputShape: [3], units: 8, activation: 'relu' })
    );

    // Output Layer: Single unit with Sigmoid for binary classification (0 or 1)
    model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

    // Compile model using Adam optimizer and binary crossentropy loss for classification
    model.compile({
        optimizer: 'adam',
        loss: 'binaryCrossentropy',
        metrics: ['accuracy'],
    });

    // Run training process for defined number of epochs
    await model.fit(trainingData, outputData, {
        epochs: EPOCHS,
        shuffle: true,
    });

    return model;
};

export const runPrediction = async (model, product) => {
    // Prepare the single product input as a 2D Tensor
    const newProductTensor = tf.tensor2d([
        [product.currentInventory, product.avgSalesPerWeek, product.daysToReplenish]
    ]);
    
    // Run the prediction
    const result = model.predict(newProductTensor);
    const value = (await result.data())[0];
    
    // Crucial: Dispose of Tensors to prevent memory leak
    newProductTensor.dispose(); 
    
    return value;
};