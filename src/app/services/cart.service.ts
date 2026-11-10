import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CartItem, Product } from '../models/models';

@Injectable({ providedIn: 'root' })
export class CartService {
  private cartItemsSubject = new BehaviorSubject<CartItem[]>(JSON.parse(localStorage.getItem('cart_items') || '[]'));
  public cartItems$ = this.cartItemsSubject.asObservable();

  get cartItems(): CartItem[] {
    return this.cartItemsSubject.value;
  }

  addToCart(product: Product, quantity: number = 1) {
    let currentCart = [...this.cartItems];
    const existingIndex = currentCart.findIndex(item => item.product._id === product._id);

    if (existingIndex > -1) {
      currentCart[existingIndex].quantity += quantity;
    } else {
      currentCart.push({ product, quantity });
    }
    this.updateCart(currentCart);
  }

  updateQuantity(productId: string, quantity: number) {
    let currentCart = [...this.cartItems];
    const index = currentCart.findIndex(item => item.product._id === productId);
    if (index > -1) {
      if (quantity <= 0) {
        currentCart.splice(index, 1);
      } else {
        currentCart[index].quantity = quantity;
      }
      this.updateCart(currentCart);
    }
  }

  removeFromCart(productId: string) {
    let currentCart = this.cartItems.filter(item => item.product._id !== productId);
    this.updateCart(currentCart);
  }

  getTotalPrice(): number {
    return this.cartItems.reduce((total, item) => total + ((item.product.price?.current || 0) * item.quantity), 0);
  }

  getTotalCount(): number {
    return this.cartItems.reduce((total, item) => total + item.quantity, 0);
  }

  private updateCart(items: CartItem[]) {
    localStorage.setItem('cart_items', JSON.stringify(items));
    this.cartItemsSubject.next(items);
  }
}
