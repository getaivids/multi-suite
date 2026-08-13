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
        <div className="flex flex-col items-center justify-center space-y-3 py-4">
            <div
                className={`${sizeClasses[size]} border-2 border-zinc-700 border-t-white rounded-full animate-spin`}
            ></div>
            {text && <p className="text-sm text-zinc-400 font-medium">{text}</p>}
        </div>
    );
};

export default Spinner;

