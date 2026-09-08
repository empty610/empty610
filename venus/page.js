import { mountVenus } from './model.js';
mountVenus(document.getElementById('venus-stage'), document.getElementById('venus-3d'));
if (location.protocol === 'file:') document.getElementById('venus-back').href = '../index.html#venus';
