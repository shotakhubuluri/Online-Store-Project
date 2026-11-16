import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, switchMap, forkJoin, of, map } from 'rxjs';
import { AuthService } from './auth.service';

const API_URL = 'https://api.everrest.educata.dev';

@Injectable({ providedIn: 'root' })
export class CartService {
  private cartSubject = new BehaviorSubject<any>(null);
  public cart$ = this.cartSubject.asObservable();
  public cartItems: any[] = [];
  private hasCart = false; // ინახავს ინფორმაციას, შექმნილია თუ არა კალათა ბექენდზე

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {
    this.authService.user$.subscribe((user) => {
      if (user) {
        this.loadCart();
      } else {
        this.cartItems = [];
        this.hasCart = false;
        this.cartSubject.next(null);
      }
    });
  }

  private get headers(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.authService.tokenValue}`,
    });
  }

  createCart(): Observable<any> {
    return this.http
      .post(`${API_URL}/shop/cart`, {}, { headers: this.headers })
      .pipe(tap(() => (this.hasCart = true)));
  }

  loadCart() {
    if (!this.authService.tokenValue) return;

    this.http.get(`${API_URL}/shop/cart`, { headers: this.headers }).subscribe({
      next: (res: any) => {
        this.hasCart = true; // კალათა უკვე არსებობს ბექენდზე!
        this.cartSubject.next(res);
        const rawProducts = res?.products || [];

        if (rawProducts.length === 0) {
          this.cartItems = [];
          return;
        }

        const detailRequests = rawProducts.map((item: any) => {
          const realId = item.productId || item._id || item.id;
          return this.http.get(`${API_URL}/shop/products/id/${realId}`).pipe(
            map((prodDetail: any) => ({
              ...prodDetail,
              productId: realId,
              quantity: item.quantity || 1,
              pricePerQuantity: item.pricePerQuantity,
            })),
            catchError(() =>
              of({
                _id: realId,
                productId: realId,
                title: 'პროდუქტი',
                quantity: item.quantity || 1,
                price: { current: item.pricePerQuantity || 0 },
              }),
            ),
          );
        });

        forkJoin(detailRequests).subscribe((enrichedItems: any) => {
          this.cartItems = enrichedItems;
        });
      },
      error: (err) => {
        if (err?.status === 400 || err?.error?.errorkeys?.includes('errors.user_has_no_cart')) {
          this.createCart().subscribe({
            next: (newCart) => {
              this.hasCart = true;
              this.cartSubject.next(newCart);
              this.cartItems = [];
            },
            error: () => {
              this.hasCart = false;
              this.cartItems = [];
            },
          });
        } else {
          this.cartItems = [];
        }
      },
    });
  }

  addToCart(product: any, quantity: number = 1): Observable<any> {
    const prodId = product._id || product.id || product.productId;
    const existingItem = this.cartItems.find(
      (item) => (item.productId || item._id || item.id) === prodId,
    );
    const targetQuantity = existingItem ? existingItem.quantity + quantity : quantity;

    const payload = {
      id: prodId,
      quantity: targetQuantity,
    };

    // თუ კალათა უკვე შექმნილია (ცარიელიც რომ იყოს), პირდაპირ PATCH-ს ვაგზავნით!
    if (this.hasCart) {
      return this.http
        .patch(`${API_URL}/shop/cart/product`, payload, { headers: this.headers })
        .pipe(
          tap(() => this.loadCart()),
          catchError((err) => this.handleCartError(err, payload)),
        );
    }

    // POST-ს ვიყენებთ მხოლოდ მაშინ, თუ კალათა საერთოდ არ არსებობდა
    return this.http.post(`${API_URL}/shop/cart/product`, payload, { headers: this.headers }).pipe(
      tap(() => {
        this.hasCart = true;
        this.loadCart();
      }),
      catchError((err) => this.handleCartError(err, payload)),
    );
  }

  private handleCartError(err: any, payload: { id: string; quantity: number }): Observable<any> {
    if (
      err?.error?.errorkeys?.includes('errors.user_already_has_cart') ||
      err?.error?.error?.includes('use patch endpoint')
    ) {
      this.hasCart = true;
      return this.http
        .patch(`${API_URL}/shop/cart/product`, payload, { headers: this.headers })
        .pipe(tap(() => this.loadCart()));
    }

    if (err?.status === 400 && err?.error?.errorkeys?.includes('errors.user_has_no_cart')) {
      return this.createCart().pipe(
        switchMap(() =>
          this.http.patch(`${API_URL}/shop/cart/product`, payload, { headers: this.headers }),
        ),
        tap(() => this.loadCart()),
      );
    }

    if (err?.error?.errorkeys?.includes('errors.not_enough_stock_to_purchase')) {
      alert('აღნიშნული პროდუქტი მარაგში არ არის ან რაოდენობა ამოიწურა!');
      throw err;
    }

    if (err?.error?.errorkeys?.includes('errors.token_expired')) {
      alert('სესიას ვადა გაუვიდა! გთხოვთ ხელახლა გაიაროთ ავტორიზაცია.');
      this.authService.logout();
      throw err;
    }

    throw err;
  }

  updateQuantity(item: any, quantity: number): Observable<any> {
    const prodId = typeof item === 'string' ? item : item.productId || item._id || item.id;
    if (quantity <= 0) {
      return this.removeFromCart(prodId);
    }

    const payload = {
      id: prodId,
      quantity: quantity,
    };

    return this.http
      .patch(`${API_URL}/shop/cart/product`, payload, { headers: this.headers })
      .pipe(tap(() => this.loadCart()));
  }

  removeFromCart(item: any): Observable<any> {
    const prodId = typeof item === 'string' ? item : item.productId || item._id || item.id;
    const options = {
      headers: this.headers,
      body: { id: prodId },
    };

    return this.http
      .delete(`${API_URL}/shop/cart/product`, options)
      .pipe(tap(() => this.loadCart()));
  }

  checkout(): Observable<any> {
    return this.http.post(`${API_URL}/shop/cart/checkout`, {}, { headers: this.headers }).pipe(
      tap(() => {
        this.hasCart = false; // შეკვეთის შემდეგ კალათა იშლება და ახლიდან შეიქმნება
        this.loadCart();
      }),
    );
  }

  getTotalCount(): number {
    return this.cartItems.reduce((acc, item) => acc + (item.quantity || 1), 0);
  }

  getTotalPrice(): number {
    return this.cartItems.reduce((acc, item) => {
      const price = item.price?.current ?? item.pricePerQuantity ?? 0;
      return acc + price * (item.quantity || 1);
    }, 0);
  }
}
