import type { Product, Ingredient, OtherItem, Sale, OnlineOrder } from './types';
import { PlaceHolderImages } from './placeholder-images';

const classicBurgerImg = PlaceHolderImages.find(p => p.id === 'classic-burger');
const baconBurgerImg = PlaceHolderImages.find(p => p.id === 'bacon-burger');
const chickenBurgerImg = PlaceHolderImages.find(p => p.id === 'chicken-burger');
const veggieBurgerImg = PlaceHolderImages.find(p => p.id === 'veggie-burger');
const doubleBurgerImg = PlaceHolderImages.find(p => p.id === 'double-burger');
const friesImg = PlaceHolderImages.find(p => p.id === 'fries');
const sodaImg = PlaceHolderImages.find(p => p.id === 'soda');
const onionRingsImg = PlaceHolderImages.find(p => p.id === 'onion-rings');

// This file is now deprecated as we are using Firebase.
// You can remove it or keep it for reference.

export const mockProducts: Product[] = [];

export const mockIngredients: Ingredient[] = [];

export const mockOtherItems: OtherItem[] = [];

export const mockSalesData: Sale[] = [];

export const mockOnlineOrders: OnlineOrder[] = [];
