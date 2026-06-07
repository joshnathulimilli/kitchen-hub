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
  admin: ['browse', 'cart', 'orders', 'support', 'vendor', 'ops'],
  customer: ['browse', 'cart', 'orders', 'support'],
  vendor: ['browse', 'orders', 'support', 'vendor', 'ops'],
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
  forgotPasswordBtn: document.getElementById('forgotPasswordBtn'),
  forgotPasswordForm: document.getElementById('forgotPasswordForm'),
  resetPasswordForm: document.getElementById('resetPasswordForm'),
  adminLoginForm: document.getElementById('adminLoginForm'),
  adminEmail: document.getElementById('adminEmail'),
  adminPassword: document.getElementById('adminPassword'),
  adminLoginLink: document.getElementById('adminLoginLink'),
  backToLoginBtn: document.getElementById('backToLoginBtn'),
  backToLoginBtn2: document.getElementById('backToLoginBtn2'),
  backToUserLoginBtn: document.getElementById('backToUserLoginBtn'),
  forgotEmail: document.getElementById('forgotEmail'),
  resetToken: document.getElementById('resetToken'),
  resetPassword: document.getElementById('resetPassword'),
  nameField: document.getElementById('nameField'),
  roleField: document.getElementById('roleField'),
  supportForm: document.getElementById('supportForm'),
  supportList: document.getElementById('supportList'),
  authSubmitBtn: document.getElementById('authSubmitBtn'),
  restaurantList: document.getElementById('restaurantList'),
  menuTitle: document.getElementById('menuTitle'),
  menuList: document.getElementById('menuList'),
  cartList: document.getElementById('cartList'),
  ordersList: document.getElementById('ordersList'),
  orderForm: document.getElementById('orderForm'),
  restaurantForm: document.getElementById('restaurantForm'),
  menuForm: document.getElementById('menuForm'),
  menuRestaurantSelect: document.getElementById('menuRestaurantSelect'),
  lastRestaurantHint: document.getElementById('lastRestaurantHint'),
  kitchenForm: document.getElementById('kitchenForm'),
  deliveryForm: document.getElementById('deliveryForm'),
  liveFeed: document.getElementById('liveFeed'),
  toast: document.getElementById('toast')
};

const fallbackImages = [
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1541542684-7f2b1e4b8f1b?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1526318472351-c75fcf07033e?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1499028344343-cd173ffc68a9?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=900&q=80'
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

const escapeHtml = escapeAttribute;

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
  els.adminLoginLink.classList.toggle('hidden', signedIn);
  els.sessionLabel.textContent = signedIn ? `${state.user.name} (${state.user.role})` : 'Not signed in';

  if (signedIn) {
    renderRoleAccess();
    loadRestaurants();
    if (canAccessTab('cart')) loadCart();
    if (canAccessTab('orders')) loadOrders();
    if (canAccessTab('support')) loadSupportTickets();
    renderOpsForms();
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
  renderOpsForms();
};

const renderOpsForms = () => {
  const role = state.user?.role;
  // hide both by default
  if (els.kitchenForm) els.kitchenForm.style.display = 'none';
  if (els.deliveryForm) els.deliveryForm.style.display = 'none';

  if (role === 'kitchen') {
    if (els.kitchenForm) els.kitchenForm.style.display = '';
  } else if (role === 'delivery') {
    if (els.deliveryForm) els.deliveryForm.style.display = '';
  } else if (role === 'admin' || role === 'vendor') {
    // admins and vendors can access both ops forms
    if (els.kitchenForm) els.kitchenForm.style.display = '';
    if (els.deliveryForm) els.deliveryForm.style.display = '';
  }
};

const renderAuthMode = () => {
  const isRegister = state.authMode === 'register';
  const isLogin = state.authMode === 'login';
  els.nameField.classList.toggle('hidden', !isRegister);
  els.roleField.classList.toggle('hidden', !isRegister);
  els.authName.required = isRegister;
  els.authSubmitBtn.textContent = isRegister ? 'Create account' : 'Login';
  els.authHelp.textContent =
    isRegister
      ? 'Register creates a new account. Use Login after the account already exists.'
      : 'Login requires an existing account with the correct password.';
  els.forgotPasswordBtn?.classList.toggle('hidden', !isLogin);
};

const showAuthView = (view) => {
  const loginVisible = view === 'login';
  const forgotVisible = view === 'forgot';
  const resetVisible = view === 'reset';
  const adminVisible = view === 'admin';

  els.authForm.classList.toggle('hidden', !loginVisible);
  els.forgotPasswordForm.classList.toggle('hidden', !forgotVisible);
  els.resetPasswordForm.classList.toggle('hidden', !resetVisible);
  els.adminLoginForm.classList.toggle('hidden', !adminVisible);

  if (loginVisible) {
    renderAuthMode();
  } else if (forgotVisible) {
    els.authHelp.textContent = 'Enter your email to receive a password reset link.';
  } else if (resetVisible) {
    els.authHelp.textContent = 'Enter the token from your email and choose a new password.';
  } else if (adminVisible) {
    els.authHelp.textContent = 'Admin panel login';
  }
};

const initResetPage = () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('resetToken');
  if (token && els.resetPasswordForm) {
    els.resetToken.value = token;
    showAuthView('reset');
  } else {
    showAuthView('login');
  }
};

const sendResetRequest = async (event) => {
  event.preventDefault();
  const email = els.forgotEmail.value.trim();
  if (!email) {
    toast('Please enter your email');
    return;
  }

  try {
    const data = await api('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    toast(data.message || 'Password reset link sent. Check your email.');
    if (data.resetUrl) {
      console.log('Password reset URL:', data.resetUrl);
    }
    els.forgotPasswordForm.reset();
    showAuthView('login');
  } catch (error) {
    toast(error.message);
  }
};

const submitResetPassword = async (event) => {
  event.preventDefault();
  const token = els.resetToken.value.trim();
  const password = els.resetPassword.value.trim();
  if (!token || !password) {
    toast('Reset token and new password are required');
    return;
  }

  try {
    const data = await api(`/api/auth/reset-password/${encodeURIComponent(token)}`, {
      method: 'POST',
      body: JSON.stringify({ password })
    });
    toast(data.message || 'Password has been reset. Please log in.');
    els.resetPasswordForm.reset();
    showAuthView('login');
  } catch (error) {
    toast(error.message);
  }
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

  if (tabName === 'support' && canAccessTab('support')) {
    loadSupportTickets();
  }
};

const loadRestaurants = async () => {
  try {
    const data = await api('/api/restaurants');
    renderRestaurants(data.restaurants || []);
    // Also populate vendor menu form dropdown
    if (state.user?.role === 'vendor' || state.user?.role === 'admin') {
      loadVendorRestaurants(data.restaurants || []);
    }
  } catch (error) {
    toast(error.message);
  }
};

const loadVendorRestaurants = (allRestaurants) => {
  const vendorRestaurants = allRestaurants.filter((r) => {
    const ownerId = typeof r.owner === 'object' ? r.owner?._id : r.owner;
    return state.user?.role === 'admin' || String(ownerId) === String(state.user?.id);
  });

  if (!els.menuRestaurantSelect) return;
  
  els.menuRestaurantSelect.innerHTML = '<option value="">-- Select restaurant --</option>';
  vendorRestaurants.forEach((restaurant) => {
    const option = document.createElement('option');
    option.value = restaurant._id;
    option.textContent = restaurant.name;
    els.menuRestaurantSelect.appendChild(option);
  });
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
      const ownerId = typeof restaurant.owner === 'object' ? restaurant.owner?._id : restaurant.owner;
      return `
        <article class="restaurant-card">
          <img src="${escapeAttribute(image)}" alt="${escapeAttribute(restaurant.name)}" loading="lazy" data-fallback-src="${escapeAttribute(fallbackImage)}" />
          <div class="body stack">
            <div>
              <h3>${escapeHtml(restaurant.name)}</h3>
              <p class="meta">${escapeHtml(cuisines)} - ${escapeHtml(restaurant.address?.city || 'Local')}</p>
            </div>
            <p class="meta">${escapeHtml(restaurant.description || 'Open for orders.')}</p>
            <div class="item-actions">
              <span class="status-pill">${escapeHtml(restaurant.status)}</span>
              <div class="row-actions">
                <button class="secondary-btn" type="button" data-open-menu="${escapeAttribute(restaurant._id)}" data-name="${escapeAttribute(restaurant.name)}" data-owner="${escapeAttribute(ownerId)}">Menu</button>
                ${
                  canDelete
                    ? `<button class="danger-btn" type="button" data-delete-restaurant="${escapeAttribute(restaurant._id)}" data-name="${escapeAttribute(restaurant.name)}">Delete</button>`
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
    
    // Auto-select restaurant in dropdown for vendors
    if ((state.user?.role === 'vendor' || state.user?.role === 'admin') && els.menuRestaurantSelect) {
      els.menuRestaurantSelect.value = restaurantId;
      els.lastRestaurantHint.textContent = `Adding menu items to: ${name}`;
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
            <h3>${escapeHtml(item.name)}</h3>
            <p class="meta">${escapeHtml(item.category)} - ${escapeHtml(item.description || 'Freshly prepared')}</p>
          </div>
          <div class="item-actions">
            <span class="price">${money(item.price)}</span>
            <div class="row-actions">
              <button class="primary-btn" type="button" data-add-item="${escapeAttribute(item._id)}">Add</button>
              ${
                canDeleteMenu
                  ? `<button class="danger-btn" type="button" data-delete-menu-item="${escapeAttribute(item._id)}" data-name="${escapeAttribute(item.name)}">Delete</button>`
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
            <h3>${escapeHtml(item.name)}</h3>
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

const renderSupportCard = (ticket) => {
  const canManage = state.user?.role === 'admin';
  const reporter = ticket.user ? `${escapeHtml(ticket.user.name || 'User')} (${escapeHtml(ticket.user.email || '')})` : 'Anonymous';
  return `
    <article class="item-row">
      <div>
        <h3>${escapeHtml(ticket.category || 'support')}</h3>
        <p class="meta">Ticket #${escapeHtml(ticket._id)} • ${escapeHtml(ticket.status)} • ${new Date(ticket.createdAt).toLocaleString()}</p>
        ${canManage ? `<p class="meta">Reported by: ${reporter}</p>` : ''}
        ${ticket.order ? `<p class="meta">Attached order: ${escapeHtml(ticket.order._id)} • Status: ${escapeHtml(ticket.order.orderStatus || 'n/a')}</p>` : ''}
      </div>
      <div class="item-actions">
        <strong>${ticket.order ? `Order ${escapeHtml(ticket.order._id)}` : 'General issue'}</strong>
        <div class="row-actions">
          ${canManage ? `<button class="secondary-btn" type="button" data-support-action="in_progress" data-ticket-id="${escapeAttribute(ticket._id)}">In Progress</button>` : ''}
          ${canManage ? `<button class="secondary-btn" type="button" data-support-action="resolved" data-ticket-id="${escapeAttribute(ticket._id)}">Resolve</button>` : ''}
          ${canManage ? `<button class="danger-btn" type="button" data-support-action="closed" data-ticket-id="${escapeAttribute(ticket._id)}">Close</button>` : ''}
        </div>
      </div>
      <p class="meta">${escapeHtml(ticket.message)}</p>
      ${ticket.resolution ? `<p class="meta"><strong>Resolution:</strong> ${escapeHtml(ticket.resolution)}</p>` : ''}
    </article>
  `;
};

const renderSupportTickets = (tickets) => {
  if (!tickets.length) {
    els.supportList.innerHTML = '<div class="empty">No support tickets found.</div>';
    return;
  }

  els.supportList.innerHTML = tickets
    .map((ticket) => renderSupportCard(ticket))
    .join('');
};

const loadSupportTickets = async () => {
  if (!state.token || !canAccessTab('support')) {
    els.supportList.innerHTML = '<div class="empty">Login is required to view support tickets.</div>';
    return;
  }

  try {
    const path = state.user?.role === 'admin' ? '/api/support/manage' : '/api/support/my';
    const data = await api(path);
    renderSupportTickets(data.tickets || []);
  } catch (error) {
    toast(error.message);
  }
};

const submitSupportTicket = async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const payload = {
    orderId: String(form.get('orderId') || '').trim(),
    category: String(form.get('category') || 'other'),
    message: String(form.get('message') || '').trim()
  };

  if (!payload.message) {
    toast('Please describe your issue');
    return;
  }

  if (!payload.orderId) {
    delete payload.orderId;
  }

  try {
    await api('/api/support', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    toast('Support ticket submitted');
    event.currentTarget.reset();
    loadSupportTickets();
  } catch (error) {
    toast(error.message);
  }
};

const updateSupportStatus = async (ticketId, status) => {
  let resolution;
  if (['resolved', 'closed'].includes(status)) {
    resolution = window.prompt('Add a resolution note (optional)');
    if (resolution !== null) {
      resolution = resolution.trim();
    }
  }
  try {
    await api(`/api/support/${encodeURIComponent(ticketId)}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, resolution })
    });
    toast(`Ticket updated to ${status}`);
    loadSupportTickets();
  } catch (error) {
    toast(error.message);
  }
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

const renderOrderCard = (order) => {
  const canPay = state.user?.role === 'customer' && order.paymentStatus !== 'paid';
  const canConfirmDelivered =
    state.user?.role === 'customer' &&
    order.orderStatus !== 'delivered' &&
    ['picked_up', 'nearby', 'delivered'].includes(order.deliveryStatus);
  const canReview = state.user?.role === 'customer' && order.orderStatus === 'delivered' && !order.isReviewed;
  const canSeeReview = state.user?.role === 'admin' && order.customerReview;
  const canUpdateKitchen = ['admin', 'vendor', 'kitchen'].includes(state.user?.role);
  const canUpdateDelivery = ['admin', 'delivery'].includes(state.user?.role);
  const deliveryPart = state.user?.role === 'kitchen' ? '' : ` - Delivery: ${escapeHtml(order.deliveryStatus)}`;

  return `
          <article class="order-row">
            <div class="item-actions">
              <div>
                <h3>${escapeHtml(order.restaurant?.name || 'Restaurant')}</h3>
                <p class="meta">Order ID: ${escapeHtml(order._id)}${order.user?.name ? ` - ${escapeHtml(order.user.name)}` : ''}</p>
              </div>
              <span class="status-pill">${escapeHtml(order.orderStatus)}</span>
            </div>
            <p class="meta">Kitchen: ${escapeHtml(order.kitchenStatus)}${deliveryPart} - Payment: ${escapeHtml(order.paymentStatus)}</p>
            ${order.specialInstructions ? `<p class="meta"><strong>Instructions:</strong> ${escapeHtml(order.specialInstructions)}</p>` : ''}
            <div class="item-actions">
              <strong>${money(order.total)}</strong>
              <div class="row-actions">
                ${
                  canUpdateKitchen
                    ? `<button class="secondary-btn" type="button" data-fill-kitchen-order="${escapeAttribute(order._id)}">Kitchen</button>`
                    : ''
                }
                ${
                  canUpdateDelivery
                    ? `<button class="secondary-btn" type="button" data-fill-delivery-order="${escapeAttribute(order._id)}">Delivery</button>`
                    : ''
                }
                ${
                  canPay
                    ? `<button class="primary-btn" type="button" data-pay-order="${escapeAttribute(order._id)}">Pay now</button>`
                    : ''
                }
                ${
                  canConfirmDelivered
                    ? `<button class="primary-btn" type="button" data-confirm-delivered="${escapeAttribute(order._id)}">Delivered</button>`
                    : ''
                }
              </div>
            </div>
            ${
              canSeeReview
                ? `
                  <div class="rating-summary">
                    <strong>Customer rating: ${order.customerReview.rating}/5</strong>
                    <p class="meta">Food: ${order.customerReview.foodRating || '-'} - Delivery: ${order.customerReview.deliveryRating || '-'}</p>
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
};

const renderOrders = (orders) => {
  if (!orders.length) {
    els.ordersList.innerHTML = '<div class="empty">No orders yet.</div>';
    return;
  }

  const activeOrders = orders.filter((order) => order.orderStatus !== 'delivered');
  const deliveredOrders = orders.filter((order) => order.orderStatus === 'delivered');

  const sections = [];

  if (activeOrders.length) {
    sections.push(`
      <section class="order-section">
        <h3>Active orders</h3>
        ${activeOrders.map((order) => renderOrderCard(order)).join('')}
      </section>
    `);
  }

  if (deliveredOrders.length) {
    sections.push(`
      <section class="order-section delivered-orders">
        <h3>Delivered orders</h3>
        ${deliveredOrders.map((order) => renderOrderCard(order)).join('')}
      </section>
    `);
  }

  els.ordersList.innerHTML = sections.join('');

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

    if (data.payment?.provider === 'mock') {
      toast('Payment completed');
      loadOrders();
      return;
    }

    if (!window.Razorpay || !data.keyId || !data.razorpayOrder) {
      throw new Error('Razorpay checkout is not ready');
    }

    const checkout = new window.Razorpay({
      key: data.keyId,
      amount: data.razorpayOrder.amount,
      currency: data.razorpayOrder.currency,
      name: 'KitchenHub',
      description: `Order ${orderId}`,
      order_id: data.razorpayOrder.id,
      prefill: {
        name: state.user?.name || '',
        email: state.user?.email || '',
        contact: state.user?.phone || ''
      },
      handler: async (response) => {
        await api('/api/payments/verify', {
          method: 'POST',
          body: JSON.stringify({
            paymentId: data.payment._id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          })
        });
        toast('Payment completed');
        loadOrders();
      },
      modal: {
        ondismiss: () => toast('Payment cancelled')
      },
      theme: {
        color: '#556b2f'
      }
    });

    checkout.open();
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
    // if a file was selected, upload it first
    const file = form.get('image');
    if (file && file.size) {
      try {
        const uploadForm = new FormData();
        uploadForm.append('image', file);
        const uploadResp = await fetch('/api/upload/image', {
          method: 'POST',
          body: uploadForm
        });
        const uploadData = await uploadResp.json();
        if (!uploadResp.ok) throw new Error(uploadData.message || 'Image upload failed');
        payload.imageUrl = uploadData.url;
      } catch (err) {
        toast(`Image upload error: ${err.message}`);
        return;
      }
    }

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
  const bulk = String(form.get('bulkItems') || '').trim();

  if (!restaurantId) {
    toast('Please select a restaurant');
    return;
  }

  let bodyPayload;
  if (bulk) {
    try {
      const items = JSON.parse(bulk);
      if (!Array.isArray(items) || !items.length) throw new Error('Bulk items must be a non-empty JSON array');
      bodyPayload = { restaurantId, items };
    } catch (err) {
      toast(`Invalid bulk JSON: ${err.message}`);
      return;
    }
  } else {
    bodyPayload = {
      restaurantId,
      name: form.get('name'),
      description: form.get('description'),
      category: form.get('category'),
      price: Number(form.get('price')),
      isVegetarian: form.get('isVegetarian') === 'on',
      isAvailable: true,
      preparationTimeMinutes: Number(form.get('preparationTimeMinutes') || 20)
    };
  }

  try {
    let endpoint = bulk ? '/api/menu/bulk' : '/api/menu';
    let uploadedImageUrl = null;

    // Handle image upload if provided
    if (!bulk && form.get('image') && form.get('image').size > 0) {
      const uploadForm = new FormData();
      uploadForm.append('image', form.get('image'));
      
      const uploadResp = await fetch('/api/upload/image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${state.token}` },
        body: uploadForm
      });
      
      const uploadData = await uploadResp.json();
      if (!uploadResp.ok) throw new Error(uploadData.message || 'Image upload failed');
      uploadedImageUrl = uploadData.url;
      bodyPayload.imageUrl = uploadedImageUrl;
    }

    await api(endpoint, {
      method: 'POST',
      body: JSON.stringify(bodyPayload)
    });

    toast(bulk ? `${bodyPayload.items.length} menu items created` : 'Menu item added');
    event.currentTarget.reset();
    els.menuForm.elements.restaurantId.value = restaurantId;
    els.menuForm.elements.isVegetarian.checked = true;
    els.menuForm.elements.preparationTimeMinutes.value = 20;
    
    if (state.selectedRestaurant === restaurantId) {
      loadMenu(restaurantId, state.selectedRestaurantName || els.menuTitle.textContent, state.selectedRestaurantOwner);
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
    showAuthView('login');
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

  // disable submit to prevent duplicate requests
  els.authSubmitBtn.disabled = true;
  try {
    const authEndpoint = state.authMode;
    const data = await api(`/api/auth/${authEndpoint}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    setSession(data);
    toast(state.authMode === 'register' ? 'Account created and signed in' : 'Logged in');
  } catch (error) {
    toast(error.message);
  } finally {
    els.authSubmitBtn.disabled = false;
  }
});

els.logoutBtn.addEventListener('click', clearSession);
els.forgotPasswordBtn?.addEventListener('click', () => showAuthView('forgot'));
els.backToLoginBtn?.addEventListener('click', () => showAuthView('login'));
els.backToLoginBtn2?.addEventListener('click', () => showAuthView('login'));
els.backToUserLoginBtn?.addEventListener('click', () => showAuthView('login'));
els.adminLoginLink?.addEventListener('click', (e) => {
  e.preventDefault();
  showAuthView('admin');
});
els.forgotPasswordForm?.addEventListener('submit', sendResetRequest);
els.resetPasswordForm?.addEventListener('submit', submitResetPassword);
els.adminLoginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = els.adminEmail.value.trim();
  const password = els.adminPassword.value.trim();
  
  if (!email || !password) {
    toast('Email and password are required');
    return;
  }

  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setSession(data);
    toast('Admin logged in');
    els.adminLoginForm.reset();
  } catch (error) {
    toast(error.message);
  }
});
initResetPage();
document.getElementById('refreshRestaurantsBtn').addEventListener('click', loadRestaurants);
document.getElementById('refreshCartBtn').addEventListener('click', loadCart);
document.getElementById('refreshOrdersBtn').addEventListener('click', loadOrders);
els.orderForm.addEventListener('submit', placeOrder);
els.restaurantForm.addEventListener('submit', createRestaurant);
els.menuForm.addEventListener('submit', createMenuItem);
els.kitchenForm.addEventListener('submit', updateKitchen);
els.deliveryForm.addEventListener('submit', updateDelivery);
els.supportForm?.addEventListener('submit', submitSupportTicket);
document.getElementById('refreshSupportBtn')?.addEventListener('click', loadSupportTickets);

// Bulk import handler
document.getElementById('bulkImportBtn')?.addEventListener('click', async (event) => {
  event.preventDefault();
  const bulkTextarea = document.querySelector('textarea[name="bulkItems"]');
  const bulk = String(bulkTextarea?.value || '').trim();
  if (!bulk) {
    toast('Paste JSON array in the bulk field first');
    return;
  }
  try {
    const restaurantId = String(els.menuRestaurantSelect?.value || '').trim();
    if (!restaurantId) {
      toast('Please select a restaurant first');
      return;
    }
    const items = JSON.parse(bulk);
    if (!Array.isArray(items) || !items.length) throw new Error('Must be a non-empty JSON array');
    
    await api('/api/menu/bulk', {
      method: 'POST',
      body: JSON.stringify({ restaurantId, items })
    });
    toast(`${items.length} menu items imported successfully`);
    bulkTextarea.value = '';
    const selectedRestId = els.menuRestaurantSelect.value;
    if (state.selectedRestaurant === selectedRestId) {
      loadMenu(selectedRestId, state.selectedRestaurantName || els.menuTitle.textContent, state.selectedRestaurantOwner);
    }
  } catch (error) {
    toast(error.message);
  }
});

// Restaurant dropdown handler
els.menuRestaurantSelect?.addEventListener('change', (e) => {
  const restaurantId = e.target.value;
  if (restaurantId && state.selectedRestaurant !== restaurantId) {
    // Find the restaurant name from dropdown
    const selectedOption = e.target.options[e.target.selectedIndex];
    state.selectedRestaurant = restaurantId;
    state.selectedRestaurantName = selectedOption?.text || 'Selected Restaurant';
    loadMenu(restaurantId, state.selectedRestaurantName, state.user?.id);
  }
});

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

  const supportAction = event.target.closest('[data-support-action]');
  if (supportAction) {
    updateSupportStatus(supportAction.dataset.ticketId, supportAction.dataset.supportAction);
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
