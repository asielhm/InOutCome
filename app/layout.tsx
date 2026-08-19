import './globals.css';
export const metadata={title:'InOutCome · Finanzas personales',description:'Tu resumen privado de ingresos y gastos en pesos argentinos',manifest:'/manifest.json'};
export const viewport={themeColor:'#5145cd'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
