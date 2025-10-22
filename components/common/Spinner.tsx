import React from 'react';

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    text?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'md', text }) => {
    const sizeClasses = {
        sm: 'w-6 h-6',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
    };

    return (
        <div className="flex flex-col items-center justify-center space-y-2">
            <div
                className={`${sizeClasses[size]} border-4 border-gray-500 border-t-cyan-400 border-solid rounded-full animate-spin`}
            ></div>
            {text && <p className="text-gray-400">{text}</p>}
        </div>
    );
};

export default Spinner;
