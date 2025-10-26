const API_BASE_URL = "https://db.madhyasth.org/api/v1";

interface BookFull {
  id: number;
  title: string;
  author_name: string;
  total_pages: number;
  verification_status: string;
  category: string;
  cover_image_base64?: string;
  cover_file?: string;
}

interface Book {
  id: number;
  title: string;
  author_name: string;
  total_pages: number;
}

interface PageFull {
  book: number;
  page_no: number;
  hard_pageno: string;
  content: string;
  html_content: string;
  tables: Array<{ image: string }>;
  images: Array<{ image: string }>;
}

interface BookPageResponseFull {
  book: BookFull;
  page: PageFull;
  navigation: {
    has_next: boolean;
    has_previous: boolean;
    next_page: number | null;
    prev_page: number | null;
    total_pages: number;
    min_page: number;
    max_page: number;
  };
}

interface BookPageResponse {
  book: {
    id: number;
    title: string;
    category: string;
  };
  page: {
    page_no: number;
    content: string;
  };
}

interface TocEntry {
  id: number;
  chapter_name: string;
  page_no: number;
  parent: number | null;
  order: number;
  children: TocEntry[];
}

interface SearchResultFull {
  book_id: number;
  book_title: string;
  page_number: number;
  hard_pageno: string;
  snippet: string;
  query: string;
}

interface SearchResult {
  book_id: number;
  book_title: string;
  page_number: number;
  snippet: string;
  query: string;
}

interface SearchResponseFull {
  count: number;
  next: string | null;
  previous: string | null;
  results: SearchResultFull[];
}

interface SearchResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: SearchResult[];
}

async function fetchApi<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

export async function listBooks(): Promise<Book[]> {
  const fullBooks = await fetchApi<BookFull[]>("/books/");
  return fullBooks.map((book) => ({
    id: book.id,
    title: book.title,
    author_name: book.author_name,
    total_pages: book.total_pages,
  }));
}

export async function getBookPage(
  bookId: number,
  pageNo: number = 1
): Promise<BookPageResponse> {
  const fullResponse = await fetchApi<BookPageResponseFull>(
    `/books/${bookId}/pages/${pageNo}/`
  );
  return {
    book: {
      id: fullResponse.book.id,
      title: fullResponse.book.title,
      category: fullResponse.book.category,
    },
    page: {
      page_no: fullResponse.page.page_no,
      content: fullResponse.page.content,
    },
  };
}

export async function getBookToc(bookId: number): Promise<TocEntry[]> {
  return fetchApi<TocEntry[]>(`/books/${bookId}/toc/`);
}

export async function searchBooks(
  query: string,
  bookIds?: string
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query, highlight: "false" });
  if (bookIds) {
    params.append("book_ids", bookIds);
  }

  const fullResponse = await fetchApi<SearchResponseFull>(
    `/search/?${params.toString()}`
  );

  return {
    count: fullResponse.count,
    next: fullResponse.next,
    previous: fullResponse.previous,
    results: fullResponse.results.map((result) => ({
      book_id: result.book_id,
      book_title: result.book_title,
      page_number: result.page_number,
      snippet: result.snippet,
      query: result.query,
    })),
  };
}
