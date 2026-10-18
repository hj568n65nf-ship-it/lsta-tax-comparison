import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';
export default defineConfig({root:resolve('pages-site'),publicDir:resolve('public'),base:'./',plugins:[react()],define:{'import.meta.env.VITE_GITHUB_PAGES':JSON.stringify('true')},build:{outDir:resolve('pages-dist'),emptyOutDir:true}});
