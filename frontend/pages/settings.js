import { useEffect, useState } from "react";

export default function Settings() {
  const [theme, setTheme] = useState("dark"); // Default to dark mode

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  return (
    <div className="container mx-auto p-6 text-center">
      <h1 className="text-2xl font-bold text-blue-800">Settings</h1>
      <p className="text-gray-700 mt-4">Customize your app experience.</p>
      
      <button 
        onClick={toggleTheme} 
        className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Switch to {theme === "dark" ? "Light Mode" : "Dark Mode"}
      </button>
    </div>
  );
}
