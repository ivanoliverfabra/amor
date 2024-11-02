export interface Image {
  id: string;
  url: string;
}

export interface User {
  id: string;
  name: string;
  image: string;
}

export interface Group {
  id: number;
  name: string;
  tags: string[];
  images: Image[];
  user: User;
}
