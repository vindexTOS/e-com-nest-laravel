/**
 * Converts a storage path to a full image URL
 * @param imagePath - The image path from the database (e.g., "products/image.jpg")
 * @returns Full URL to the image
 */
export const getImageUrl = (imagePath: string | null | undefined): string | null => {
    if (!imagePath) return null;
    
    // If it's already a full URL, return it
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }
    
    // Handle escaped forward slashes from JSON encoding
    // products\/image.png -> products/image.png
    // products\\\/image.png -> products/image.png
    // Replace any sequence of backslashes followed by forward slash with just forward slash
    let cleanPath = imagePath.replace(/\\+\//g, '/');
    
    // Remove leading slash if present
    cleanPath = cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath;
    
    // Construct the URL - Laravel serves images from /storage/{path}
    const baseUrl = import.meta.env.VITE_LARAVEL_URL || 
                    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    
    return `${baseUrl}/storage/${cleanPath}`;
};

/**
 * Gets product image URL via API Gateway
 * @param imagePath - The image path from the database
 * @returns Full URL to the image via API Gateway
 */
export const getProductImageUrl = (imagePath: string | null | undefined): string | null => {
    if (!imagePath) return null;
    
    // If it's already a full URL, return it
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }
    
    // Extract filename from path (e.g., "products/image.jpg" -> "image.jpg")
    const filename = imagePath.split('/').pop() || imagePath;
    
    // Use API Gateway endpoint
    const gatewayUrl = import.meta.env.VITE_API_GATEWAY_URL || 
                       (typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    
    return `${gatewayUrl}/api/gateway/storage/product-image/${filename}`;
};

