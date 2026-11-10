export interface User {
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  age?: number;
  gender?: string;
  phone?: string;
  address?: string;
  zipcode?: string;
  avatar?: string;
}

export interface Product {
  _id: string;
  title: string;
  description: string;
  category: string;
  brand: string;
  price: {
    current: number;
    currency: string;
  };
  rating: number;
  ratingsCount?: number;
  stock: number;
  thumbnail: string;
  issueDate?: string;
  reviews?: Review[];
}

export interface Review {
  userName: string;
  rating: number;
  comment: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
