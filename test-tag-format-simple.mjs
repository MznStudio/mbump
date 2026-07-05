import { NodeVersionProvider } from './dist/index.js';

const provider = new NodeVersionProvider();

// 测试根包
const rootTag = provider.getDefaultTagFormat('@mznjs/mbump', '2.2.11', true);
console.log('根包 tag:', rootTag);
console.log('根包期望: v2.2.11');
console.log('根包正确:', rootTag === 'v2.2.11');

// 测试子包
const childTag = provider.getDefaultTagFormat('theme', '0.0.8', false);
console.log('子包 tag:', childTag);
console.log('子包期望: theme@0.0.8');
console.log('子包正确:', childTag === 'theme@0.0.8');