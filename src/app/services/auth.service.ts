import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, of } from 'rxjs';
import { User } from '../models/models';

const API_URL = 'https://api.everrest.educata.dev';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userSubject = new BehaviorSubject<User | null>(
    JSON.parse(localStorage.getItem('currentUser') || 'null'),
  );
  public user$ = this.userSubject.asObservable();
  private tokenSubject = new BehaviorSubject<string | null>(localStorage.getItem('token'));

  constructor(private http: HttpClient) {}

  public get currentUserValue(): User | null {
    return this.userSubject.value;
  }

  public get tokenValue(): string | null {
    return this.tokenSubject.value;
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${API_URL}/auth/sign_up`, userData);
  }

  login(credentials: any): Observable<any> {
    return this.http.post<any>(`${API_URL}/auth/sign_in`, credentials).pipe(
      tap((res) => {
        if (res.access_token) {
          localStorage.setItem('token', res.access_token);
          this.tokenSubject.next(res.access_token);

          this.fetchUserProfile().subscribe({
            error: () => {
              const fallbackUser: User = {
                firstName: credentials.email.split('@')[0],
                lastName: '',
                email: credentials.email,
              };
              localStorage.setItem('currentUser', JSON.stringify(fallbackUser));
              this.userSubject.next(fallbackUser);
            },
          });
        }
      }),
    );
  }

  fetchUserProfile(): Observable<any> {
    if (!this.tokenValue) return of(null);
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.tokenValue}` });
    return this.http.get(`${API_URL}/auth`, { headers }).pipe(
      tap((user) => {
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.userSubject.next(user as User);
      }),
      catchError(() => {
        const saved = localStorage.getItem('currentUser');
        if (saved) {
          const user = JSON.parse(saved);
          this.userSubject.next(user);
          return of(user);
        }
        return of(null);
      }),
    );
  }

  updatePassword(passwordData: { oldPassword: string; newPassword: string }): Observable<any> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.tokenValue}` });
    return this.http.patch(`${API_URL}/auth/change_password`, passwordData, { headers }).pipe(
      catchError((err) => {
        if (err.status === 404) {
          return this.http.patch(`${API_URL}/auth/change-password`, passwordData, { headers });
        }
        throw err;
      }),
    );
  }

  deleteAccount(): Observable<any> {
    const headers = new HttpHeaders({ Authorization: `Bearer ${this.tokenValue}` });
    return this.http.delete(`${API_URL}/auth/delete`, { headers }).pipe(tap(() => this.logout()));
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    this.tokenSubject.next(null);
    this.userSubject.next(null);
  }
}
