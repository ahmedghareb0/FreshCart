import { Route, Routes } from 'react-router-dom'
import { ErrorMessage } from './components/common/ErrorMessage'
import { Loading } from './components/common/Loading'
import { MainLayout } from './components/layout/MainLayout'
import { ProductDetailsPage } from './pages/ProductDetailsPage'
import { ProductsPage } from './pages/ProductsPage'
import { BrandsPage } from './pages/BrandsPage'
import { BrandDetailsPage } from './pages/BrandDetailsPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { CategoryDetailsPage } from './pages/CategoryDetailsPage'
import { HomePage } from './pages/HomePage'
import { NotFound } from './pages/NotFound'
import { WishlistPage } from './pages/WishlistPage'
import { CartPage } from './pages/CartPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { OrdersPage } from './pages/OrdersPage'
import {
  ChangePasswordPage,
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
  VerifyResetCodePage,
} from './pages/AuthPages'
import { GuestRoute, ProtectedRoute } from './routes/AuthRoutes'

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/:productId" element={<ProductDetailsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="categories/:categoryId" element={<CategoryDetailsPage />} />
        <Route path="brands" element={<BrandsPage />} />
        <Route path="brands/:brandId" element={<BrandDetailsPage />} />
        <Route element={<GuestRoute />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="verify-reset-code" element={<VerifyResetCodePage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="change-password" element={<ChangePasswordPage />} />
          <Route path="wishlist" element={<WishlistPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="orders" element={<OrdersPage />} />
        </Route>
        <Route path="loading" element={<Loading />} />
        <Route
          path="error"
          element={<ErrorMessage message="Something went wrong. Please try again." />}
        />
        <Route path="not-found" element={<NotFound />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
