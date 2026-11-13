import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
await build({configFile:false,plugins:[react()],logLevel:'error',build:{ssr:'scripts/check-ui-entry.jsx',outDir:'node_modules/.astrocare-qa',emptyOutDir:true}});
const {checkScreens}=await import(pathToFileURL(resolve('node_modules/.astrocare-qa/check-ui-entry.js')));
checkScreens();
