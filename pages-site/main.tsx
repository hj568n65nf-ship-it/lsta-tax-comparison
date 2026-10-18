import React from 'react';
import {createRoot} from 'react-dom/client';
import Home from '../app/page';
import Model from '../app/model/page';
import '../app/globals.css';
const model=new URLSearchParams(window.location.search).get('view')==='model';
if(model)document.title='Model LSTA Agreement | LSTA Tax Comparison';
createRoot(document.getElementById('root')!).render(model?<Model/>:<Home/>);
