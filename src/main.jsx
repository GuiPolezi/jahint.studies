import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './styles.mobile.css' // camada de responsividade — carrega depois para vencer na cascata

createRoot(document.getElementById('root')).render(<App />)
