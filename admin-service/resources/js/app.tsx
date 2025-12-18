import React from 'react';
import ReactDOM from 'react-dom/client';
import '../css/app.css';

const App: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-100">
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-4">
                    E-Commerce Admin Panel
                </h1>
                <p className="text-gray-600">
                    Laravel + React + TypeScript application is running!
                </p>
            </div>
        </div>
    );
};

const rootElement = document.getElementById('app');

if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
} else {
    console.error('Root element with id "app" not found');
}

