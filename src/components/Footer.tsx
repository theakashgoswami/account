import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">AG TechScript</span>
          </div>
          <p className="text-xs text-zinc-500">
            &copy; {new Date().getFullYear()} AG TechScript. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="https://agtechscript.com/privacy" className="text-xs text-zinc-500 hover:text-white">Privacy</a>
            <a href="https://agtechscript.com/tnc" className="text-xs text-zinc-500 hover:text-white">Terms</a>
            <a href="https://agtechscript.com/support" className="text-xs text-zinc-500 hover:text-white">Support</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
