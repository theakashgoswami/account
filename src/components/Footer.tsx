import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-indigo-600 text-[10px] font-bold text-white">
              AG
            </div>
            <span className="text-sm font-semibold text-white">TechScript</span>
          </div>
          <p className="text-xs text-zinc-500">
            &copy; {new Date().getFullYear()} AG TechScript. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-xs text-zinc-500 hover:text-white">Privacy</a>
            <a href="#" className="text-xs text-zinc-500 hover:text-white">Terms</a>
            <a href="#" className="text-xs text-zinc-500 hover:text-white">Support</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
