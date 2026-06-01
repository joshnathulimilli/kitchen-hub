const state = {
  token: localStorage.getItem('kh_token') || '',
  user: JSON.parse(localStorage.getItem('kh_user') || 'null'),
  authMode: 'login',
  selectedRestaurant: null,
  selectedRestaurantName: '',
  selectedRestaurantOwner: '',
  liveEventKeys: new Set(),
  socket: null
};

const roleTabs = {
  admin: ['browse', 'cart', 'orders', 'vendor', 'ops'],
  customer: ['browse', 'cart', 'orders'],
  vendor: ['browse', 'orders', 'vendor', 'ops'],
  kitchen: ['orders', 'ops'],
  delivery: ['orders', 'ops']
};

const els = {
  authPanel: document.getElementById('authPanel'),
  workspace: document.getElementById('workspace'),
  sessionLabel: document.getElementById('sessionLabel'),
  logoutBtn: document.getElementById('logoutBtn'),
  authForm: document.getElementById('authForm'),
  authName: document.getElementById('authName'),
  authRole: document.getElementById('authRole'),
  authHelp: document.getElementById('authHelp'),
  nameField: document.getElementById('nameField'),
  roleField: document.getElementById('roleField'),
  authSubmitBtn: document.getElementById('authSubmitBtn'),
  restaurantList: document.getElementById('restaurantList'),
  menuTitle: document.getElementById('menuTitle'),
  menuList: document.getElementById('menuList'),
  cartList: document.getElementById('cartList'),
  ordersList: document.getElementById('ordersList'),
  orderForm: document.getElementById('orderForm'),
  restaurantForm: document.getElementById('restaurantForm'),
  menuForm: document.getElementById('menuForm'),
  lastRestaurantHint: document.getElementById('lastRestaurantHint'),
  kitchenForm: document.getElementById('kitchenForm'),
  deliveryForm: document.getElementById('deliveryForm'),
  liveFeed: document.getElementById('liveFeed'),
  toast: document.getElementById('toast')
};

const fallbackImages = [
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=900&q=80'
];

const fallbackImageFor = (index = 0) => fallbackImages[index % fallbackImages.length];

const restaurantImageFor = (restaurant, index) => {
  const imageUrl = String(restaurant.imageUrl || '').trim();
  return imageUrl || fallbackImageFor(index);
};

const escapeAttribute = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return entities[char];
  });

const money = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;

const toast = (message) => {
  els.toast.textContent = message;
  els.toast.classList.remove('hidden');
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => els.toast.classList.add('hidden'), 3200);
};

const api = async (path, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
};

const setSession = ({ token, user }) => {
  state.token = token;
  state.user = user;
  localStorage.setItem('kh_token', token);
  localStorage.setItem('kh_user', JSON.stringify(user));
  renderSession();
  connectSocket();
};

const clearSession = () => {
  state.token = '';
  state.user = null;
  localStorage.removeItem('kh_token');
  localStorage.removeItem('kh_user');
  if (state.socket) state.socket.disconnect();
  renderSession();
};

const verifyStoredSession = async () => {
  if (!state.token) {
    renderSession();
    return;
  }

  try {
    const data = await api('/api/auth/me');
    state.user = data.user;
    localStorage.setItem('kh_user', JSON.stringify(data.user));
  } catch (error) {
    clearSession();
    return;
  }

  renderSession();
  connectSocket();
};

const renderSession = () => {
  const signedIn = Boolean(state.token && state.user);
  els.authPanel.classList.toggle('hidden', signedIn);
  els.workspace.classList.toggle('hidden', !signedIn);
  els.logoutBtn.classList.toggle('hidden', !signedIn);
  els.sessionLabel.textContent = signedIn ? `${state.user.name} (${state.user.role})` : 'Not signed in';

  if (signedIn) {
    renderRoleAccess();
    loadRestaurants();
    if (canAccessTab('cart')) loadCart();
    if (canAccessTab('orders')) loadOrders();
  }
};

const canAccessTab = (tabName) => {
  const allowedTabs = roleTabs[state.user?.role] || ['browse'];
  return allowedTabs.includes(tabName);
};

const renderRoleAccess = () => {
  const allowedTabs = roleTabs[state.user?.role] || ['browse'];

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.toggle('hidden', !allowedTabs.includes(tab.dataset.tab));
  });

  document.querySelectorAll('.tab-panel').forEach((panel) => {
    const tabName = panel.id.replace('Panel', '');
    panel.classList.toggle('hidden', !allowedTabs.includes(tabName));
  });

  const currentTab = document.querySelector('.tab.active')?.dataset.tab;
  const nextTab = allowedTabs.includes(currentTab) ? currentTab : allowedTabs[0];
  switchTab(nextTab);
};

const renderAuthMode = () => {
  const isRegister = state.authMode === 'register';
  els.nameField.classList.toggle('hidden', !isRegister);
  els.roleField.classList.toggle('hidden', !isRegister);
  els.authName.required = isRegister;
  els.authSubmitBtn.textContent = isRegister ? 'Create account' : 'Login';
  els.authHelp.textContent = isRegister
    ? 'Register creates a new account. Use Login after the account already exists.'
    : 'Login requires an existing account with the correct password.';
};

const connectSocket = () => {
  if (!state.token || !window.io) return;
  if (state.socket) state.socket.disconnect();

  state.socket = io();
  state.socket.on('connect', () => {
    state.socket.emit('join:user', state.user.id);
  });
  state.socket.on('order:update', (payload) => {
    addLiveEvent(`Order ${payload.orderId}: ${payload.orderStatus}`, `order:${payload.orderId}:${payload.orderStatus}`);
    loadOrders();
    loadCart();
  });
  state.socket.on('kitchen:update', (payload) => {
    if (payload.kitchenStatus !== payload.orderStatus) {
      addLiveEvent(`Kitchen ${payload.orderId}: ${payload.kitchenStatus}`, `kitchen:${payload.orderId}:${payload.kitchenStatus}`);
    }
  });
};

const addLiveEvent = (message, key = message) => {
  if (state.liveEventKeys.has(key)) return;
  state.liveEventKeys.add(key);
  if (state.liveEventKeys.size > 60) {
    state.liveEventKeys = new Set([...state.liveEventKeys].slice(-30));
  }

  const row = document.createElement('div');
  row.className = 'feed-row';
  row.innerHTML = `<strong>${message}</strong><p class="meta">${new Date().toLocaleTimeString()}</p>`;
  els.liveFeed.prepend(row);
};

const switchTab = (tabName) => {
  if (state.user && !canAccessTab(tabName)) {
    toast('You do not have access to this page');
    return;
  }

  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.id === `${tabName}Panel`);
  });
};

const loadRestaurants = async () => {
  try {
    const data = await api('/api/restaurants');
    renderRestaurants(data.restaurants || []);
  } catch (error) {
    toast(error.message);
  }
};

const renderRestaurants = (restaurants) => {
  if (!restaurants.length) {
    els.restaurantList.innerHTML = '<div class="empty">No restaurants yet. Create one from the Vendor tab.</div>';
    return;
  }

  els.restaurantList.innerHTML = restaurants
    .map((restaurant, index) => {
      const image = restaurantImageFor(restaurant, index);
      const fallbackImage = fallbackImageFor(index);
      const cuisines = (restaurant.cuisineTypes || []).join(', ') || 'Food';
      const canDelete = state.user?.role === 'admin';
      return `
        <article class="restaurant-card">
          <img src="${escapeAttribute(image)}" alt="${escapeAttribute(restaurant.name)}" loading="lazy" data-fallback-src="${escapeAttribute(fallbackImage)}" />
          <div class="body stack">
            <div>
              <h3>${restaurant.name}</h3>
              <p class="meta">${cuisines} - ${restaurant.address?.city || 'Local'}</p>
            </div>
            <p class="meta">${restaurant.description || 'Open for orders.'}</p>
            <div class="item-actions">
              <span class="status-pill">${restaurant.status}</span>
              <div class="row-actions">
                <button class="secondary-btn" type="button" data-open-menu="${restaurant._id}" data-name="${restaurant.name}" data-owner="${escapeAttribute(restaurant.owner)}">Menu</button>
                ${
                  canDelete
                    ? `<button class="danger-btn" type="button" data-delete-restaurant="${restaurant._id}" data-name="${restaurant.name}">Delete</button>`
                    : ''
                }
              </div>
            </div>
          </div>
        </article>
      `;
    })
    .join('');

  els.restaurantList.querySelectorAll('img[data-fallback-src]').forEach((image) => {
    image.addEventListener('error', () => {
      const fallbackSrc = image.dataset.fallbackSrc;
      if (fallbackSrc && image.src !== fallbackSrc) {
        image.src = fallbackSrc;
      }
    });
  });
};

const deleteRestaurant = async (restaurantId, name) => {
  const confirmed = window.confirm(`Delete ${name}? Menu items will become unavailable.`);
  if (!confirmed) return;

  try {
    await api(`/api/restaurants/${restaurantId}`, {
      method: 'DELETE'
    });
    toast('Restaurant deleted');
    if (state.selectedRestaurant === restaurantId) {
      state.selectedRestaurant = null;
      els.menuTitle.textContent = 'Select a restaurant';
      els.menuList.innerHTML = '';
    }
    loadRestaurants();
  } catch (error) {
    toast(error.message);
  }
};

const loadMenu = async (restaurantId, name, ownerId = state.selectedRestaurantOwner) => {
  try {
    state.selectedRestaurant = restaurantId;
    state.selectedRestaurantName = name;
    state.selectedRestaurantOwner = ownerId;
    els.menuTitle.textContent = name;
    if (els.menuForm?.elements.restaurantId) {
      els.menuForm.elements.restaurantId.value = restaurantId;
      els.lastRestaurantHint.textContent = `Adding menu items to: ${name} (${restaurantId})`;
    }
    const data = await api(`/api/menu/${restaurantId}`);
    renderMenu(data.items || []);
  } catch (error) {
    toast(error.message);
  }
};

const renderMenu = (items) => {
  if (!items.length) {
    els.menuList.innerHTML = '<div class="empty">No menu items yet.</div>';
    return;
  }

  const canDeleteMenu =
    state.user?.role === 'admin' ||
    (state.user?.role === 'vendor' && String(state.selectedRestaurantOwner || '') === String(state.user?.id || ''));
  els.menuList.innerHTML = items
    .map(
      (item) => `
        <article class="item-row">
          <div>
            <h3>${item.name}</h3>
            <p class="meta">${item.category} - ${item.description || 'Freshly prepared'}</p>
          </div>
          <div class="item-actions">
            <span class="price">${money(item.price)}</span>
            <div class="row-actions">
              <button class="primary-btn" type="button" data-add-item="${item._id}">Add</button>
              ${
                canDeleteMenu
                  ? `<button class="danger-btn" type="button" data-delete-menu-item="${item._id}" data-name="${item.name}">Delete</button>`
                  : ''
              }
            </div>
          </div>
        </article>
      `
    )
    .join('');
};

const deleteMenuItem = async (menuItemId, name) => {
  const confirmed = window.confirm(`Delete ${name}? It will be hidden from the menu.`);
  if (!confirmed) return;

  try {
    await api(`/api/menu/item/${menuItemId}`, {
      method: 'DELETE'
    });
    toast('Menu item deleted');
    if (state.selectedRestaurant) {
      loadMenu(state.selectedRestaurant, els.menuTitle.textContent, state.selectedRestaurantOwner);
    }
  } catch (error) {
    toast(error.message);
  }
};

const addToCart = async (foodItemId) => {
  try {
    await api('/api/cart/add', {
      method: 'POST',
      body: JSON.stringify({ foodItemId, quantity: 1 })
    });
    toast('Added to cart');
    loadCart();
  } catch (error) {
    toast(error.message);
  }
};

const loadCart = async () => {
  if (!state.token) return;
  try {
    const data = await api('/api/cart');
    renderCart(data.cart);
  } catch (error) {
    toast(error.message);
  }
};

const renderCart = (cart) => {
  const items = cart?.items || [];
  if (!items.length) {
    els.cartList.innerHTML = '<div class="empty">Cart is empty. Add menu items from Browse.</div>';
    return;
  }

  els.cartList.innerHTML = `
    ${items
      .map(
        (item) => `
          <article class="item-row">
            <h3>${item.name}</h3>
            <p class="meta">Quantity ${item.quantity}</p>
            <strong>${money(item.price * item.quantity)}</strong>
          </article>
        `
      )
      .join('')}
    <article class="item-row">
      <div class="item-actions">
        <h3>Subtotal</h3>
        <strong>${money(cart.subtotal)}</strong>
      </div>
    </article>
  `;
};

const placeOrder = async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const deliveryAddress = {
    street: form.get('street'),
    city: form.get('city'),
    state: form.get('state'),
    postalCode: form.get('postalCode'),
    country: 'India'
  };

  try {
    const data = await api('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ deliveryAddress })
    });
    toast(`Order placed: ${data.order._id}`);
    event.currentTarget.reset();
    switchTab('orders');
    loadCart();
    loadOrders();
  } catch (error) {
    toast(error.message);
  }
};

const loadOrders = async () => {
  if (!state.token || !canAccessTab('orders')) {
    els.ordersList.innerHTML = '<div class="empty">Login is required to view orders.</div>';
    return;
  }

  try {
    const operationalRoles = ['admin', 'vendor', 'kitchen', 'delivery'];
    const ordersPath = operationalRoles.includes(state.user?.role) ? '/api/orders/manage' : '/api/orders/my-orders';
    const data = await api(ordersPath);
    renderOrders(data.orders || []);
  } catch (error) {
    toast(error.message);
  }
};

const renderOrders = (orders) => {
  if (!orders.length) {
    els.ordersList.innerHTML = '<div class="empty">No orders yet.</div>';
    return;
  }

  els.ordersList.innerHTML = orders
    .map(
      (order) => {
        const canPay = state.user?.role === 'customer' && order.paymentStatus !== 'paid';
        const canConfirmDelivered =
          state.user?.role === 'customer' &&
          order.orderStatus !== 'delivered' &&
          ['picked_up', 'nearby', 'delivered'].includes(order.deliveryStatus);
        const canReview = state.user?.role === 'customer' && order.orderStatus === 'delivered' && !order.isReviewed;
        const canSeeReview = state.user?.role === 'admin' && order.customerReview;
        const canUpdateKitchen = ['admin', 'vendor', 'kitchen'].includes(state.user?.role);
        const canUpdateDelivery = ['admin', 'delivery'].includes(state.user?.role);
        return `
        <article class="order-row">
          <div class="item-actions">
            <div>
              <h3>${order.restaurant?.name || 'Restaurant'}</h3>
              <p class="meta">Order ID: ${order._id}${order.user?.name ? ` - ${order.user.name}` : ''}</p>
            </div>
            <span class="status-pill">${order.orderStatus}</span>
          </div>
          <p class="meta">Kitchen: ${order.kitchenStatus} - Delivery: ${order.deliveryStatus} - Payment: ${order.paymentStatus}</p>
          <div class="item-actions">
            <strong>${money(order.total)}</strong>
            <div class="row-actions">
              ${
                canUpdateKitchen
                  ? `<button class="secondary-btn" type="button" data-fill-kitchen-order="${order._id}">Kitchen</button>`
                  : ''
              }
              ${
                canUpdateDelivery
                  ? `<button class="secondary-btn" type="button" data-fill-delivery-order="${order._id}">Delivery</button>`
                  : ''
              }
              ${
                canPay
                  ? `<button class="primary-btn" type="button" data-pay-order="${order._id}">Pay now</button>`
                  : ''
              }
              ${
                canConfirmDelivered
                  ? `<button class="primary-btn" type="button" data-confirm-delivered="${order._id}">Delivered</button>`
                  : ''
              }
            </div>
          </div>
          ${
            canSeeReview
              ? `
                <div class="rating-summary">
                  <strong>Customer rating: ${order.customerReview.rating}/5</strong>
                  <p class="meta">Food: ${order.customerReview.foodRating || '-'} - Delivery: ${
                    order.customerReview.deliveryRating || '-'
                  }</p>
                  ${order.customerReview.comment ? `<p class="meta">${escapeAttribute(order.customerReview.comment)}</p>` : ''}
                </div>
              `
              : ''
          }
          ${
            canReview
              ? `
                <form class="rating-form" data-review-order="${order._id}">
                  <label>Overall
                    <select name="rating" required>
                      <option value="5">5</option>
                      <option value="4">4</option>
                      <option value="3">3</option>
                      <option value="2">2</option>
                      <option value="1">1</option>
                    </select>
                  </label>
                  <label>Food
                    <select name="foodRating" required>
                      <option value="5">5</option>
                      <option value="4">4</option>
                      <option value="3">3</option>
                      <option value="2">2</option>
                      <option value="1">1</option>
                    </select>
                  </label>
                  <label>Delivery
                    <select name="deliveryRating" required>
                      <option value="5">5</option>
                      <option value="4">4</option>
                      <option value="3">3</option>
                      <option value="2">2</option>
                      <option value="1">1</option>
                    </select>
                  </label>
                  <label class="rating-comment">Comment
                    <input name="comment" placeholder="How was the food and delivery?" />
                  </label>
                  <button class="secondary-btn" type="submit">Submit rating</button>
                </form>
              `
              : order.isReviewed
                ? '<p class="meta">Rating submitted. Thank you.</p>'
                : ''
          }
        </article>
      `;
      }
    )
    .join('');

  orders.forEach((order) => {
    if (state.socket) state.socket.emit('join:order', order._id);
  });
};

const payForOrder = async (orderId) => {
  try {
    const data = await api('/api/payments/create', {
      method: 'POST',
      body: JSON.stringify({ orderId })
    });

    if (data.payment?.provider === 'stripe') {
      toast('Payment started. Use the Stripe client secret to complete checkout.');
    } else {
      toast('Payment completed');
    }
    loadOrders();
  } catch (error) {
    toast(error.message);
  }
};

const confirmDelivered = async (orderId) => {
  try {
    await api(`/api/orders/${orderId}/confirm-delivered`, {
      method: 'PUT'
    });
    toast('Delivery confirmed');
    loadOrders();
  } catch (error) {
    toast(error.message);
  }
};

const submitReview = async (event, form = event.currentTarget) => {
  event.preventDefault();
  const data = new FormData(form);

  try {
    await api('/api/reviews/add', {
      method: 'POST',
      body: JSON.stringify({
        orderId: form.dataset.reviewOrder,
        rating: Number(data.get('rating')),
        foodRating: Number(data.get('foodRating')),
        deliveryRating: Number(data.get('deliveryRating')),
        comment: String(data.get('comment') || '').trim()
      })
    });
    toast('Rating submitted');
    loadOrders();
  } catch (error) {
    toast(error.message);
  }
};

const createRestaurant = async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const payload = {
    name: form.get('name'),
    description: form.get('description'),
    cuisineTypes: String(form.get('cuisineTypes') || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    phone: form.get('phone'),
    imageUrl: String(form.get('imageUrl') || '').trim(),
    status: 'open',
    address: {
      street: form.get('street'),
      city: form.get('city'),
      country: 'India'
    }
  };

  try {
    const data = await api('/api/restaurants', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const restaurantId = data.restaurant._id;
    els.menuForm.elements.restaurantId.value = restaurantId;
    els.lastRestaurantHint.textContent = `Latest restaurant: ${data.restaurant.name} (${restaurantId})`;
    toast(`Restaurant created. Menu form is ready.`);
    event.currentTarget.reset();
    loadRestaurants();
  } catch (error) {
    toast(error.message);
  }
};

const createMenuItem = async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const restaurantId = String(form.get('restaurantId') || '').trim();
  const payload = {
    restaurantId,
    name: form.get('name'),
    description: form.get('description'),
    category: form.get('category'),
    price: Number(form.get('price')),
    isVegetarian: form.get('isVegetarian') === 'on',
    isAvailable: true,
    preparationTimeMinutes: Number(form.get('preparationTimeMinutes') || 20)
  };

  try {
    await api('/api/menu', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    toast('Menu item created');
    event.currentTarget.reset();
    els.menuForm.elements.restaurantId.value = restaurantId;
    els.menuForm.elements.isVegetarian.checked = true;
    els.menuForm.elements.preparationTimeMinutes.value = 20;
    if (state.selectedRestaurant === restaurantId) {
      loadMenu(restaurantId, state.selectedRestaurantName || els.menuTitle.textContent, state.selectedRestaurantOwner);
    } else {
      els.lastRestaurantHint.textContent = `Keep using restaurant: ${restaurantId}`;
    }
  } catch (error) {
    toast(error.message);
  }
};

const updateKitchen = async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const orderId = String(form.get('orderId') || '').trim();
  try {
    await api(`/api/kitchen/status/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: form.get('status'), note: form.get('note') })
    });
    toast('Kitchen status updated');
  } catch (error) {
    toast(error.message);
  }
};

const updateDelivery = async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const orderId = String(form.get('orderId') || '').trim();
  try {
    await api(`/api/delivery/status/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: form.get('status'), note: form.get('note') })
    });
    toast('Delivery status updated');
  } catch (error) {
    toast(error.message);
  }
};

document.querySelectorAll('[data-auth-mode]').forEach((button) => {
  button.addEventListener('click', () => {
    state.authMode = button.dataset.authMode;
    document.querySelectorAll('[data-auth-mode]').forEach((item) => {
      item.classList.toggle('active', item === button);
    });
    renderAuthMode();
  });
});

document.querySelectorAll('.tab').forEach((button) => {
  button.addEventListener('click', () => switchTab(button.dataset.tab));
});

els.authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const payload = {
    email: form.get('email'),
    password: form.get('password')
  };

  if (state.authMode === 'register') {
    payload.name = form.get('name');
    payload.role = form.get('role');
  }

  try {
    const data = await api(`/api/auth/${state.authMode}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    setSession(data);
    toast(state.authMode === 'register' ? 'Account created and signed in' : 'Logged in');
  } catch (error) {
    toast(error.message);
  }
});

els.logoutBtn.addEventListener('click', clearSession);
document.getElementById('refreshRestaurantsBtn').addEventListener('click', loadRestaurants);
document.getElementById('refreshCartBtn').addEventListener('click', loadCart);
document.getElementById('refreshOrdersBtn').addEventListener('click', loadOrders);
els.orderForm.addEventListener('submit', placeOrder);
els.restaurantForm.addEventListener('submit', createRestaurant);
els.menuForm.addEventListener('submit', createMenuItem);
els.kitchenForm.addEventListener('submit', updateKitchen);
els.deliveryForm.addEventListener('submit', updateDelivery);

document.addEventListener('click', (event) => {
  const menuButton = event.target.closest('[data-open-menu]');
  if (menuButton) {
    loadMenu(menuButton.dataset.openMenu, menuButton.dataset.name, menuButton.dataset.owner);
  }

  const addButton = event.target.closest('[data-add-item]');
  if (addButton) {
    addToCart(addButton.dataset.addItem);
  }

  const deleteButton = event.target.closest('[data-delete-restaurant]');
  if (deleteButton) {
    deleteRestaurant(deleteButton.dataset.deleteRestaurant, deleteButton.dataset.name);
  }

  const deleteMenuButton = event.target.closest('[data-delete-menu-item]');
  if (deleteMenuButton) {
    deleteMenuItem(deleteMenuButton.dataset.deleteMenuItem, deleteMenuButton.dataset.name);
  }

  const payButton = event.target.closest('[data-pay-order]');
  if (payButton) {
    payForOrder(payButton.dataset.payOrder);
  }

  const deliveredButton = event.target.closest('[data-confirm-delivered]');
  if (deliveredButton) {
    confirmDelivered(deliveredButton.dataset.confirmDelivered);
  }

  const kitchenFillButton = event.target.closest('[data-fill-kitchen-order]');
  if (kitchenFillButton) {
    els.kitchenForm.elements.orderId.value = kitchenFillButton.dataset.fillKitchenOrder;
    switchTab('ops');
  }

  const deliveryFillButton = event.target.closest('[data-fill-delivery-order]');
  if (deliveryFillButton) {
    els.deliveryForm.elements.orderId.value = deliveryFillButton.dataset.fillDeliveryOrder;
    switchTab('ops');
  }
});

document.addEventListener('submit', (event) => {
  const reviewForm = event.target.closest('[data-review-order]');
  if (reviewForm) {
    submitReview(event, reviewForm);
  }
});

renderAuthMode();
verifyStoredSession();
