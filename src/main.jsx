import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './styles.mobile.css' // camada de responsividade — carrega depois para vencer na cascata
import './styles.print.css' // "Exportar PDF": a anotação vira documento limpo na impressão

createRoot(document.getElementById('root')).render(<App />)
