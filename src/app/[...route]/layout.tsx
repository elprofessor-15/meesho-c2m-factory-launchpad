import {Suspense} from 'react';
import Workspace from '@/components/workspace';

export default function WorkspaceLayout({children}:{children:React.ReactNode}){
 return <><Suspense fallback={<p className="loading">Opening your workspace…</p>}><Workspace/></Suspense>{children}</>;
}
