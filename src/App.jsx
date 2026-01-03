import './App.css'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import GoogleDrive from './Components/GoogleDrive'
import GoogleSheets from './Components/GoogleSheets'

function App() {
  return (
    <Router>
      <div className="App">
        {/* Navigation Bar */}
        <nav className="bg-white shadow-md mb-0">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-800">
                Google Workspace Manager
              </h1>
              <div className="flex gap-4">
                <Link
                  to="/"
                  className="px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100 transition font-medium"
                >
                  📁 Drive
                </Link>
                <Link
                  to="/sheets"
                  className="px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100 transition font-medium"
                >
                  📊 Sheets
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<GoogleDrive />} />
          <Route path="/sheets" element={<GoogleSheets />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App