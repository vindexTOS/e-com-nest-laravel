<?php

namespace App\Services;

class PaymentService
{
    /**
     * Process payment with mock implementation (90% success rate)
     * 
     * @param float $amount
     * @param string|null $paymentMethod
     * @return array{status: string, transactionId: string|null, message: string}
     */
    public function processPayment(float $amount, ?string $paymentMethod = null): array
    {
        // 90% success rate - simple random check
        $success = rand(1, 100) <= 90;

        if ($success) {
            return [
                'status' => 'paid',
                'transactionId' => 'TXN-' . strtoupper(uniqid()),
                'message' => 'Payment processed successfully',
            ];
        }

        return [
            'status' => 'failed',
            'transactionId' => null,
            'message' => 'Payment processing failed. Please try again.',
        ];
    }
}

