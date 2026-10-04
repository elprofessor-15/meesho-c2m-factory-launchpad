import type {Metadata} from 'next';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/noto-sans-devanagari/400.css';
import './globals.css';
export const metadata:Metadata={title:'C2M Launchpad | Manufacturer workspace',description:'Independent manufacturer onboarding and demand planning prototype. Sample business data.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
