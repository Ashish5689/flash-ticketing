import type { Booking, SeatHold } from '../types/booking';
import { apiRequest } from './api';

export async function createSeatHold(showId: string, seats: string[]) {
  return (
    await apiRequest<{ hold: SeatHold }>('/bookings/hold', {
      method: 'POST',
      body: JSON.stringify({ showId, seats }),
    })
  ).hold;
}

export async function getSeatHold(holdId: string) {
  return (await apiRequest<{ hold: SeatHold }>(`/bookings/hold/${holdId}`)).hold;
}

export function releaseSeatHold(holdId: string) {
  return apiRequest<void>(`/bookings/hold/${holdId}`, { method: 'DELETE' });
}

export async function createStripeCheckout(holdId: string, idempotencyKey: string) {
  return (
    await apiRequest<{ session: { id: string; url: string } }>('/bookings/checkout-session', {
      method: 'POST',
      headers: { 'idempotency-key': idempotencyKey },
      body: JSON.stringify({ holdId }),
    })
  ).session;
}

export async function completeStripeCheckout(checkoutSessionId: string) {
  return (
    await apiRequest<{ booking: Booking }>('/bookings/confirm', {
      method: 'POST',
      body: JSON.stringify({ checkoutSessionId }),
    })
  ).booking;
}

export function getPaymentConfiguration() {
  return apiRequest<{ provider: 'stripe'; configured: boolean }>('/bookings/payment-config');
}

export async function getBookings() {
  return (await apiRequest<{ bookings: Booking[] }>('/bookings')).bookings;
}

export async function getBooking(orderId: string) {
  return (await apiRequest<{ booking: Booking }>(`/bookings/${orderId}`)).booking;
}
