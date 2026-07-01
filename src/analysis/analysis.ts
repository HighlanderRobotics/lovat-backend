import { calculate } from './calculate';

const Analysis = {
  calculate: async (...args: Parameters<typeof calculate>) => await calculate(...args),
};

export default Analysis;
