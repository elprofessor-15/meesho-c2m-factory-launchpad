import {beforeEach,expect,it,vi} from 'vitest';
import {seed} from '../src/lib/fixtures';
const mocks=vi.hoisted(()=>({quota:vi.fn(),read:vi.fn(),mutate:vi.fn(),model:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('../src/lib/server/repository',()=>({quota:mocks.quota,read:mocks.read,mutate:mocks.mutate}));
vi.mock('../src/lib/server/env',()=>({configuration:()=>({llm:['gemini','groq']}),env:()=>({AI_MAX_MODEL_CALLS_PER_TURN:3,AI_MAX_OUTPUT_TOKENS:500})}));
vi.mock('../src/lib/providers/ai',()=>({model:mocks.model}));
vi.mock('../src/lib/assistant/tools',()=>({toolDefinitions:[],runTool:()=>({total:4,route:'/orders?due=today'})}));
import {assistant} from '../src/lib/assistant/orchestrator';
beforeEach(()=>{vi.resetAllMocks();const state=seed('2026-10-04');mocks.read.mockResolvedValue(state);mocks.mutate.mockImplementation(async(_s,fn)=>fn(state));mocks.quota.mockResolvedValue(undefined);});
it('recovers from Gemini failure with Groq tool use and grounded answer',async()=>{
 mocks.model.mockRejectedValueOnce(new Error('Provider quota')).mockResolvedValueOnce({calls:[{name:'list_orders',args:{due:'today'}}],text:'',usage:{provider:'groq'}}).mockResolvedValueOnce({calls:[],text:'Four orders are due today.',usage:{provider:'groq'}});
 const reply=await assistant({id:'test'},'Explain dispatch priorities','en');expect(reply.provider).toBe('groq');expect(reply.text).toBe('Four orders are due today.');expect(reply.records).toMatchObject([{tool:'list_orders',total:4}]);expect(mocks.model.mock.calls.map(c=>c[0])).toEqual(['gemini','groq','groq']);
});
it('tries the next provider when a model returns an empty response',async()=>{
 mocks.model.mockResolvedValueOnce({calls:[],text:'',usage:{}}).mockResolvedValueOnce({calls:[],text:'Please choose a product.',usage:{provider:'groq'}});
 const reply=await assistant({id:'test'},'Which product?','en');expect(reply.text).toBe('Please choose a product.');expect(reply.provider).toBe('groq');
});
