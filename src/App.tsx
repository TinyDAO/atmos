import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ToolsLayout from './pages/tools/ToolsLayout'
import ToolsIndexPage from './pages/tools/ToolsIndexPage'
import ChinaMojiScanPage from './pages/tools/ChinaMojiScanPage'
import UsCityScanPage from './pages/tools/UsCityScanPage'
import EuCityScanPage from './pages/tools/EuCityScanPage'
import JpCityScanPage from './pages/tools/JpCityScanPage'
import KrCityScanPage from './pages/tools/KrCityScanPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/tools" element={<ToolsLayout />}>
          <Route index element={<ToolsIndexPage />} />
          <Route path="china-scan" element={<ChinaMojiScanPage />} />
          <Route path="us-scan" element={<UsCityScanPage />} />
          <Route path="eu-scan" element={<EuCityScanPage />} />
          <Route path="jp-scan" element={<JpCityScanPage />} />
          <Route path="kr-scan" element={<KrCityScanPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
