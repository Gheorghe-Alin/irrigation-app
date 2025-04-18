// src/components/Toolbar.jsx
import React from "react";
import { User, Settings } from "lucide-react";

const Toolbar = () => {
  return (
    <header className="flex items-center justify-between bg-gray-800 text-white px-6 py-3 border-b">
      <div className="flex items-center gap-4">
        {/* Buton pentru Profile */}
        <button className="p-2 rounded-lg hover:bg-gray-600 flex items-center justify-center">
          <User size={20} />
        </button>

        {/* Buton pentru Settings */}
        <button className="p-2 rounded-lg hover:bg-gray-600 flex items-center justify-center">
          <Settings size={20} />
        </button>

        {/* Buton pentru Login */}
        <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition">
          Login
        </button>
      </div>
    </header>
  );
};

export default Toolbar;
