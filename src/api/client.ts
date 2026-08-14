import type { AgentResponse, Cart, OrderResult, PastOrder, Product } from "../types";
const API_BASE_URL=(import.meta.env.VITE_API_BASE_URL||"http://localhost:8000/api").replace(/\/$/,"");
export class ApiError extends Error { constructor(message:string, public status?:number, public details?:unknown){super(message);this.name="ApiError";} }
async function request<T>(path:string, init:RequestInit={}):Promise<T>{
  let response:Response;
  try { response=await fetch(`${API_BASE_URL}${path}`,{...init,headers:{"Content-Type":"application/json",...init.headers}}); }
  catch(cause){throw new ApiError("Could not connect to the ordering server.",undefined,cause);}
  if(response.status===204)return undefined as T;
  let body:unknown; try{body=await response.json();}catch{body=undefined;}
  if(!response.ok){const detail=typeof body==="object"&&body&&"detail" in body?String((body as {detail:unknown}).detail):`Request failed (${response.status}).`;throw new ApiError(detail,response.status,body);}
  return body as T;
}
export const api={
  searchMenu:(query:string)=>request<Product[]>(`/menu/?q=${encodeURIComponent(query)}`),
  getCart:(sessionId:string)=>request<Cart>(`/cart/?session_id=${encodeURIComponent(sessionId)}`),
  addItem:(sessionId:string,productId:number,quantity:number)=>request<Cart>("/cart/items/",{method:"POST",body:JSON.stringify({session_id:sessionId,product_id:productId,quantity})}),
  updateItem:(itemId:number,quantity:number)=>request<Cart>(`/cart/items/${itemId}/`,{method:"PATCH",body:JSON.stringify({quantity})}),
  removeItem:(itemId:number)=>request<void>(`/cart/items/${itemId}/`,{method:"DELETE"}),
  clearCart:(sessionId:string)=>request<void>(`/cart/?session_id=${encodeURIComponent(sessionId)}`,{method:"DELETE"}),
  placeOrder:(sessionId:string)=>request<OrderResult>("/orders/place/",{method:"POST",body:JSON.stringify({session_id:sessionId})}),
  getOrders:(customerId:string)=>request<PastOrder[]>(`/orders/?customer_id=${encodeURIComponent(customerId)}`),
  askAgent:(sessionId:string,customerId:string,message:string)=>request<AgentResponse>("/agent/message/",{method:"POST",body:JSON.stringify({session_id:sessionId,customer_id:customerId,message})}),
  synthesizeSpeech:async(text:string,language:"en-PK"|"ur-PK")=>{
    const response=await fetch(`${API_BASE_URL}/speech/`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text,language})});
    if(!response.ok){let body:unknown;try{body=await response.json()}catch{body=undefined}const detail=typeof body==="object"&&body&&"detail" in body?String((body as {detail:unknown}).detail):"Speech synthesis failed.";throw new ApiError(detail,response.status,body)}
    return response.blob();
  },
};
