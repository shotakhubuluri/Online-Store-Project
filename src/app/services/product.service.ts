import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_URL = 'https://api.everrest.educata.dev';

@Injectable({ providedIn: 'root' })
export class ProductService {
  constructor(private http: HttpClient) {}

  getProducts(page: number = 1, limit: number = 18, filters: any = {}): Observable<any> {
    let params = new HttpParams()
      .set('page_index', page.toString())
      .set('page_size', limit.toString());

    if (filters.category) params = params.set('category_id', filters.category);
    if (filters.brand) params = params.set('brand', filters.brand);
    if (filters.minPrice !== null && filters.minPrice !== undefined && filters.minPrice !== '') {
      params = params.set('price_min', filters.minPrice.toString());
    }
    if (filters.maxPrice !== null && filters.maxPrice !== undefined && filters.maxPrice !== '') {
      params = params.set('price_max', filters.maxPrice.toString());
    }
    if (filters.minRating) params = params.set('rating_min', filters.minRating.toString());

    if (filters.search && filters.search.trim() !== '') {
      params = params.set('keywords', filters.search.trim());
      return this.http.get(`${API_URL}/shop/products/search`, { params });
    }

    return this.http.get(`${API_URL}/shop/products/all`, { params });
  }

  getProductById(id: string): Observable<any> {
    return this.http.get(`${API_URL}/shop/products/id/${id}`);
  }

  getCategories(): Observable<any> {
    return this.http.get(`${API_URL}/shop/products/categories`);
  }

  getBrands(): Observable<any> {
    return this.http.get(`${API_URL}/shop/products/brands`);
  }
}
