export type Role = 'admin' | 'member'

export type BorrowingStatus = 'pending' | 'borrowing' | 'rejected' | 'returned' | 'cancelled'

export type RaterRole = 'owner' | 'borrower'

export interface Account {
  _id: string
  firstName: string
  lastName: string
  email: string
  role: Role
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface Book {
  _id: string
  title: string
  author: string
  publisher: string
  edition: number
  isbn: string
  cover?: string

  owner: Account
  tags: string[]
  quantity: number
  deletedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface Borrowing {
  _id: string
  book: Book
  owner: Account
  borrower: Account
  startDate: string
  dueDate: string
  returnedDate?: string
  status: BorrowingStatus
  createdAt?: string
  updatedAt?: string
}

export interface Rating {
  _id: string
  borrowing: Borrowing
  rater: Account
  ratee: Account
  raterRole: RaterRole
  rating: number
  comment?: string
  deletedAt?: string | null
  createdAt?: string
}

export interface DecoratedBorrowing extends Borrowing {
  _role: RaterRole
  counterpart: string
  counterpartId?: string
  counterpartName: string
}

export interface Tag {
  _id: string

  bookCount: number
}

export interface Paginated<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface FieldError {
  field: string
  message: string
}

export interface AuthResponse {
  token: string
  account: Account
}

export interface RatingStats {
  average: number
  count: number
}

export interface RatingSummary {
  overall: RatingStats
  asOwner: RatingStats
  asBorrower: RatingStats
}

export interface DayCount {
  day: number
  count: number
}

export interface DashboardStats {
  members: number
  books: number
  pendingRequests: number
  activeBorrowings: number
}

export interface TagCount {
  tag: string
  count: number
}

export interface TopBook {
  bookId: string
  title: string
  author: string
  count: number
}

export interface TopPerson {
  accountId: string
  firstName: string
  lastName: string
  count: number
}

export interface DashboardOverview {
  stats: DashboardStats
  perDay: { borrowed: DayCount[]; returned: DayCount[] }
  booksByTag: TagCount[]
  topBooks: TopBook[]
  topOwners: TopPerson[]
  topBorrowers: TopPerson[]
}
