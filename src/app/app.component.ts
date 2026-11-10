import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from './services/auth.service';
import { ProductService } from './services/product.service';
import { CartService } from './services/cart.service';
import { Product } from './models/models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
})
export class App implements OnInit {
  currentView: 'home' | 'detail' | 'cart' = 'home';
  activeTab: 'details' | 'review' = 'details';

  products: Product[] = [];
  categories: any[] = [];
  brands: string[] = [];
  activeProduct: Product | null = null;

  currentPage: number = 1;
  totalPages: number = 1;
  loading: boolean = false;

  // Filters
  searchKeyword: string = '';
  selectedCategory: string = '';
  selectedBrand: string = '';
  minPrice: number | null = null;
  maxPrice: number | null = null;
  selectedRating: string = '';

  // Modals
  showAuthModal: boolean = false;
  authMode: 'login' | 'register' = 'login';
  authData = {
    firstName: '',
    lastName: '',
    age: 20,
    email: '',
    password: '',
    address: '',
    phone: '',
    zipcode: '',
    avatar: '',
    gender: 'MALE',
  };
  authError: string = '';
  fieldErrors: { [key: string]: boolean } = {};

  showProfileModal: boolean = false;
  passwordData = { oldPassword: '', newPassword: '' };

  showReviewModal: boolean = false;
  reviewData = { rating: 5, userName: '', comment: '' };

  constructor(
    public authService: AuthService,
    public productService: ProductService,
    public cartService: CartService,
  ) {}

  ngOnInit() {
    this.loadProducts();
    this.loadCategories();
    this.loadBrands();
  }

  loadProducts() {
    this.loading = true;

    const isSearchSet = !!(this.searchKeyword && this.searchKeyword.trim() !== '');
    const isCategorySelected = !!this.selectedCategory;
    const isBrandSelected = !!this.selectedBrand;
    const isMinPriceSet =
      this.minPrice !== null && this.minPrice !== undefined && Number(this.minPrice) > 0;
    const isMaxPriceSet =
      this.maxPrice !== null && this.maxPrice !== undefined && Number(this.maxPrice) > 0;
    const isRatingSet = !!this.selectedRating;

    const hasActiveFilter =
      isSearchSet ||
      isCategorySelected ||
      isBrandSelected ||
      isMinPriceSet ||
      isMaxPriceSet ||
      isRatingSet;

    const limit = hasActiveFilter ? 50 : 18;
    const pageToFetch = hasActiveFilter ? 1 : this.currentPage;

    const filters = {
      category: this.selectedCategory,
      brand: this.selectedBrand,
      minPrice: isMinPriceSet ? this.minPrice : null,
      maxPrice: isMaxPriceSet ? this.maxPrice : null,
      minRating: this.selectedRating,
      search: this.searchKeyword,
    };

    this.productService.getProducts(pageToFetch, limit, filters).subscribe({
      next: (res: any) => {
        let rawList: any[] = [];
        if (res && res.products) {
          rawList = res.products;
        } else if (Array.isArray(res)) {
          rawList = res;
        }

        let filtered = rawList.filter((item) => {
          // 1. ძებნა
          if (isSearchSet) {
            const query = this.searchKeyword.toLowerCase().trim();
            const titleMatch = item.title && item.title.toLowerCase().includes(query);
            const descMatch = item.description && item.description.toLowerCase().includes(query);
            const brandMatch = item.brand && item.brand.toLowerCase().includes(query);
            if (!titleMatch && !descMatch && !brandMatch) return false;
          }

          // 2. კატეგორიის ფილტრი (ამოწმებს id, category, category_id და name-ს)
          if (isCategorySelected) {
            const itemCatId = String(
              item.category_id ||
                item.categoryId ||
                item.category?._id ||
                item.category?.id ||
                item.category ||
                '',
            ).toLowerCase();
            const selected = String(this.selectedCategory).toLowerCase();

            // იპოვეთ არჩეული კატეგორიის ობიექტი სახელით შედარებისთვის
            const selectedCatObj = this.categories.find(
              (c) =>
                String(c.id || c._id) === selected || String(c.name).toLowerCase() === selected,
            );
            const selectedName = selectedCatObj
              ? String(selectedCatObj.name).toLowerCase()
              : selected;

            const matchesId = itemCatId === selected;
            const matchesName =
              itemCatId.includes(selectedName) ||
              (item.category && String(item.category).toLowerCase().includes(selectedName));

            if (!matchesId && !matchesName) return false;
          }

          // 3. ბრენდის ფილტრი
          if (isBrandSelected && item.brand !== this.selectedBrand) {
            return false;
          }

          // 4. ფასის ფილტრი
          if (isMinPriceSet && item.price?.current < Number(this.minPrice)) {
            return false;
          }
          if (isMaxPriceSet && item.price?.current > Number(this.maxPrice)) {
            return false;
          }

          // 5. რეიტინგის ფილტრი
          if (isRatingSet && item.rating < Number(this.selectedRating)) {
            return false;
          }

          return true;
        });

        this.products = filtered;

        if (hasActiveFilter) {
          this.currentPage = 1;
          this.totalPages = 1;
        } else {
          const totalCount = res && res.total ? res.total : rawList.length;
          this.totalPages = Math.ceil(totalCount / 18) || 1;
        }

        this.loading = false;
      },
      error: () => {
        this.products = [];
        this.loading = false;
      },
    });
  }

  loadCategories() {
    this.productService.getCategories().subscribe({
      next: (res: any) => (this.categories = Array.isArray(res) ? res : res.categories || []),
    });
  }

  loadBrands() {
    this.productService.getBrands().subscribe({
      next: (res: any) => (this.brands = Array.isArray(res) ? res : res.brands || []),
    });
  }

  applyFilters() {
    this.currentPage = 1;
    this.loadProducts();
  }

  resetFilters() {
    this.searchKeyword = '';
    this.selectedCategory = '';
    this.selectedBrand = '';
    this.minPrice = null;
    this.maxPrice = null;
    this.selectedRating = '';
    this.applyFilters();
  }

  changePage(page: number) {
    this.currentPage = page;
    this.loadProducts();
  }
  // გვერდების ნომრების მასივის გენერაცია (1, 2, 3...)
  get pagesArray(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  navigate(view: 'home' | 'detail' | 'cart') {
    this.currentView = view;
  }

  viewProductDetail(id: string) {
    this.productService.getProductById(id).subscribe((res) => {
      this.activeProduct = res;
      this.currentView = 'detail';
      this.activeTab = 'details';
    });
  }
  // სურათის ჩატვირთვის ხარვეზისას Fallback სურათის ჩასმა
  onImageError(event: Event) {
    const imgElement = event.target as HTMLImageElement;
    // შეგიძლიათ გამოიყენოთ ნებისმიერი ლამაზი Placeholder სურათის URL
    imgElement.src = 'https://via.placeholder.com/300x300?text=No+Image+Available';
  }

  addToCart(product: Product) {
    if (!this.authService.currentUserValue) {
      alert('კალათაში დამატებამდე გთხოვთ გაიაროთ ავტორიზაცია!');
      this.openAuthModal('login');
      return;
    }
    this.cartService.addToCart(product);
    alert('პროდუქტი დაემატა კალათაში!');
  }

  openAuthModal(mode: 'login' | 'register') {
    this.authMode = mode;
    this.authError = '';
    this.fieldErrors = {};
    this.showAuthModal = true;
  }

  closeAuthModal() {
    this.showAuthModal = false;
  }

  validateAuth(): boolean {
    this.fieldErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let isValid = true;

    if (!emailRegex.test(this.authData.email)) {
      this.fieldErrors['email'] = true;
      this.authError = 'გთხოვთ მიუთითოთ სწორი ელ.ფოსტის ფორმატი!';
      isValid = false;
    }

    if (!this.authData.password || this.authData.password.length < 8) {
      this.fieldErrors['password'] = true;
      this.authError = 'პაროლი უნდა შეიცავდეს მინიმუმ 8 სიმბოლოს!';
      isValid = false;
    }

    if (this.authMode === 'register') {
      if (!this.authData.firstName) {
        this.fieldErrors['firstName'] = true;
        isValid = false;
      }
      if (!this.authData.lastName) {
        this.fieldErrors['lastName'] = true;
        isValid = false;
      }
      if (!this.authData.phone || !this.authData.phone.startsWith('+995')) {
        this.fieldErrors['phone'] = true;
        this.authError = 'ტელეფონის ნომერი უნდა იწყებოდეს +995-ით (მაგ: +995595250587)!';
        isValid = false;
      }
      if (!this.authData.address) {
        this.fieldErrors['address'] = true;
        isValid = false;
      }
      if (!this.authData.zipcode) {
        this.fieldErrors['zipcode'] = true;
        isValid = false;
      }
      if (!this.authData.age || this.authData.age <= 0) {
        this.fieldErrors['age'] = true;
        isValid = false;
      }
    }

    if (!isValid && !this.authError) {
      this.authError = 'გთხოვთ შეავსოთ ყველა აუცილებელი ველი სწორად!';
    }

    return isValid;
  }

  submitAuth() {
    this.authError = '';
    if (!this.validateAuth()) return;

    if (this.authMode === 'login') {
      this.authService
        .login({ email: this.authData.email, password: this.authData.password })
        .subscribe({
          next: () => this.closeAuthModal(),
          error: (err) => {
            this.fieldErrors['email'] = true;
            this.fieldErrors['password'] = true;
            const msg = err?.error?.message;
            this.authError = Array.isArray(msg)
              ? msg.join(', ')
              : msg || 'ავტორიზაცია ვერ განხორციელდა.';
          },
        });
    } else {
      // 1. მონაცემების მომზადება ბექენდისთვის
      const payload: any = {
        firstName: this.authData.firstName.trim(),
        lastName: this.authData.lastName.trim(),
        age: Number(this.authData.age),
        email: this.authData.email.trim(),
        password: this.authData.password,
        address: this.authData.address.trim(),
        phone: this.authData.phone.trim(),
        zipcode: this.authData.zipcode.trim(),
        gender: this.authData.gender,
      };

      // 2. თუ ავატარი მითითებულია და ვალიდურია, მხოლოდ მაშინ გავატანოთ
      if (this.authData.avatar && this.authData.avatar.trim() !== '') {
        payload.avatar = this.authData.avatar.trim();
      }

      this.authService.register(payload).subscribe({
        next: () => {
          alert('რეგისტრაცია წარმატებით დასრულდა! ახლა გაიარეთ ავტორიზაცია.');
          this.authMode = 'login';
        },
        error: (err) => {
          console.error('API Error Response:', err);
          const errRes = err?.error;

          if (errRes?.message) {
            this.authError = Array.isArray(errRes.message)
              ? errRes.message.join(' | ')
              : errRes.message;
          } else if (typeof errRes === 'string') {
            this.authError = errRes;
          } else {
            this.authError = 'რეგისტრაცია ვერ განხორციელდა. შეამოწმეთ ველები.';
          }
        },
      });
    }
  }

  changePassword() {
    if (!this.passwordData.oldPassword || !this.passwordData.newPassword) {
      alert('გთხოვთ შეავსოთ ორივე პაროლის ველი!');
      return;
    }
    if (this.passwordData.newPassword.length < 8) {
      alert('ახალი პაროლი უნდა იყოს მინიმუმ 8 სიმბოლო!');
      return;
    }

    this.authService.updatePassword(this.passwordData).subscribe({
      next: () => {
        alert('პაროლი წარმატებით განახლდა!');
        this.passwordData = { oldPassword: '', newPassword: '' };
        this.showProfileModal = false;
      },
      error: () => alert('პაროლის შეცვლა ვერ განხორციელდა. შეამოწმეთ ძველი პაროლი.'),
    });
  }

  confirmDeleteAccount() {
    if (confirm('ნამდვილად გსურთ ექაუნთის წაშლა? ეს ქმედება შეუქმნადია!')) {
      this.authService.deleteAccount().subscribe({
        next: () => {
          alert('თქვენი ანგარიში წაშლილია.');
          this.showProfileModal = false;
        },
        error: () => alert('ანგარიშის წაშლისას დაფიქსირდა შეცდომა.'),
      });
    }
  }

  logout() {
    this.authService.logout();
  }

  openReviewModal() {
    const user = this.authService.currentUserValue;
    if (user) {
      this.reviewData.userName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    this.showReviewModal = true;
  }

  submitReview() {
    if (!this.activeProduct) return;
    if (!this.authService.currentUserValue) {
      alert('შეფასების დასატოვებლად გაიარეთ ავტორიზაცია!');
      this.showReviewModal = false;
      this.openAuthModal('login');
      return;
    }

    if (!this.activeProduct.reviews) {
      this.activeProduct.reviews = [];
    }

    this.activeProduct.reviews.push({
      userName: this.reviewData.userName || 'ანონიმური',
      rating: this.reviewData.rating,
      comment: this.reviewData.comment,
    });

    alert('შეფასება წარმატებით დაემატა!');
    this.showReviewModal = false;
    this.reviewData = { rating: 5, userName: '', comment: '' };
  }

  checkout() {
    alert('შეკვეთა მიღებულია! გმადლობთ შენაძენისთვის.');
  }
}
