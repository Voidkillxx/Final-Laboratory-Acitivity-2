<?php

namespace Database\Factories;

use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Product>
 */
class ProductFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var string
     */
    protected $model = Product::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $a = ['Gaming', 'Ultra-Slim', 'Mechanical', '4K', 'SSD', 'Portable', 'Wireless', 'Ergonomic'];
        $n = ['Keyboard', 'Mouse', 'Monitor', 'RAM Stick', 'Webcam', 'Router', 'Power Supply', 'Graphics Card', 'Laptop'];
        
        $productName = $this->faker->randomElement($a) 
                       . ' ' 
                       . $this->faker->randomElement($n) 
                       . ' - SN-' 
                       . $this->faker->numberBetween(10000, 99999); 

        return [
            'product_name' => $productName, 
            'current_inventory' => $this->faker->numberBetween(50, 800), 
            'avg_sales_per_week' => $this->faker->randomFloat(2, 10, 150), 
            'days_to_replenish' => $this->faker->randomFloat(2, 3, 25), 
        ];
    }
}