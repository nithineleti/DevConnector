const API_BASE = window.location.origin;

const state = {
  token: localStorage.getItem('token') || '',
  me: null,
  projects: [],
  profiles: []
};

const authState = document.getElementById('authState');
const logoutBtn = document.getElementById('logoutBtn');
const meCard = document.getElementById('meCard');
const projectsFeed = document.getElementById('projectsFeed');
const profilesFeed = document.getElementById('profilesFeed');
const logArea = document.getElementById('logArea');
const statProjects = document.getElementById('statProjects');
const statProfiles = document.getElementById('statProfiles');

const registerForm = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');
const profileForm = document.getElementById('profileForm');
const projectForm = document.getElementById('projectForm');

const loadProjectsBtn = document.getElementById('loadProjectsBtn');
const loadProfilesBtn = document.getElementById('loadProfilesBtn');
const refreshMeBtn = document.getElementById('refreshMeBtn');
const deleteProfileBtn = document.getElementById('deleteProfileBtn');
const clearLogBtn = document.getElementById('clearLogBtn');

function log(message, isError = false) {
  const line = document.createElement('div');
  line.className = 'log-line';
  line.style.color = isError ? '#ff9cb1' : '#b9ffd3';
  line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  logArea.prepend(line);
}

function authHeaders(json = true) {
  const headers = {};
  if (json) headers['Content-Type'] = 'application/json';
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  return headers;
}

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.message || data.errors?.map((e) => e.msg).join(', ') || 'Request failed';
    throw new Error(msg);
  }
  return data;
}

function setAuthUI() {
  const label = state.me ? `${state.me.name} (${state.me.role})` : 'Guest';
  authState.textContent = label;
  logoutBtn.classList.toggle('hidden', !state.token);
}

function renderMe() {
  if (!state.me) {
    meCard.textContent = 'Login to load your identity.';
    return;
  }
  meCard.innerHTML = `
    <strong>${state.me.name}</strong><br>
    <span>${state.me.email}</span><br>
    <span>Role: ${state.me.role}</span><br>
    <span>ID: ${state.me._id}</span>
  `;
}

function projectCard(project) {
  const item = document.createElement('article');
  item.className = 'item';

  const tech = Array.isArray(project.techStack) ? project.techStack.join(', ') : project.techStack || '';
  const likes = Array.isArray(project.likes) ? project.likes.length : 0;
  const isMine = state.me && project.owner && (project.owner._id === state.me._id || project.owner === state.me._id);

  item.innerHTML = `
    <div class="item-head">
      <strong>${project.title || 'Untitled Project'}</strong>
      <span class="pill">${likes} likes</span>
    </div>
    <p>${project.description || 'No description'}</p>
    <small>Tech: ${tech || 'n/a'}</small>
    <small>Owner: ${project.owner?.name || project.owner || 'unknown'}</small>
    <div class="item-actions">
      <button class="btn ghost like-btn" data-id="${project._id}">Like / Unlike</button>
      <button class="btn ghost comment-btn" data-id="${project._id}">Add Comment</button>
      ${isMine ? `<button class="btn danger delete-btn" data-id="${project._id}">Delete</button>` : ''}
    </div>
  `;
  return item;
}

function profileCard(profile) {
  const item = document.createElement('article');
  item.className = 'item';
  const skills = Array.isArray(profile.skills) ? profile.skills.join(', ') : '';
  item.innerHTML = `
    <div class="item-head">
      <strong>${profile.user?.name || 'Unknown user'}</strong>
      <span class="pill">${profile.location || 'No location'}</span>
    </div>
    <p>${profile.bio || 'No bio'}</p>
    <small>Skills: ${skills || 'n/a'}</small>
    <small>Email: ${profile.user?.email || 'n/a'}</small>
  `;
  return item;
}

function renderProjects() {
  projectsFeed.innerHTML = '';
  state.projects.forEach((project) => projectsFeed.appendChild(projectCard(project)));
  statProjects.textContent = String(state.projects.length);
}

function renderProfiles() {
  profilesFeed.innerHTML = '';
  state.profiles.forEach((profile) => profilesFeed.appendChild(profileCard(profile)));
  statProfiles.textContent = String(state.profiles.length);
}

async function refreshMe() {
  if (!state.token) {
    state.me = null;
    setAuthUI();
    renderMe();
    return;
  }

  try {
    state.me = await api('/api/auth/me', {
      headers: authHeaders(false)
    });
    setAuthUI();
    renderMe();
    log('Session loaded');
  } catch (err) {
    log(`Session expired: ${err.message}`, true);
    state.token = '';
    state.me = null;
    localStorage.removeItem('token');
    setAuthUI();
    renderMe();
  }
}

async function loadProjects() {
  try {
    state.projects = await api('/api/projects');
    renderProjects();
    log(`Loaded ${state.projects.length} projects`);
  } catch (err) {
    log(`Load projects failed: ${err.message}`, true);
  }
}

async function loadProfiles() {
  try {
    state.profiles = await api('/api/profiles');
    renderProfiles();
    log(`Loaded ${state.profiles.length} profiles`);
  } catch (err) {
    log(`Load profiles failed: ${err.message}`, true);
  }
}

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(registerForm);
  const payload = {
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password')
  };

  try {
    await api('/api/auth/register', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    registerForm.reset();
    log('Registration successful. You can now log in.');
  } catch (err) {
    log(`Registration failed: ${err.message}`, true);
  }
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(loginForm);
  const payload = {
    email: formData.get('email'),
    password: formData.get('password')
  };

  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });

    state.token = data.token;
    localStorage.setItem('token', data.token);
    loginForm.reset();
    await refreshMe();
    await Promise.all([loadProjects(), loadProfiles()]);
    log('Login successful');
  } catch (err) {
    log(`Login failed: ${err.message}`, true);
  }
});

logoutBtn.addEventListener('click', () => {
  state.token = '';
  state.me = null;
  localStorage.removeItem('token');
  setAuthUI();
  renderMe();
  log('Logged out');
});

refreshMeBtn.addEventListener('click', refreshMe);
loadProjectsBtn.addEventListener('click', loadProjects);
loadProfilesBtn.addEventListener('click', loadProfiles);
clearLogBtn.addEventListener('click', () => {
  logArea.innerHTML = '';
});

profileForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!state.token) {
    log('Please login to save profile', true);
    return;
  }

  const formData = new FormData(profileForm);
  const payload = {
    bio: formData.get('bio'),
    location: formData.get('location'),
    skills: formData.get('skills'),
    social: {
      github: formData.get('github'),
      linkedin: formData.get('linkedin')
    }
  };

  try {
    await api('/api/profiles', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    await loadProfiles();
    log('Profile saved');
  } catch (err) {
    log(`Profile save failed: ${err.message}`, true);
  }
});

deleteProfileBtn.addEventListener('click', async () => {
  if (!state.token) {
    log('Please login to delete profile', true);
    return;
  }

  if (!window.confirm('Delete your profile?')) return;

  try {
    await api('/api/profiles', {
      method: 'DELETE',
      headers: authHeaders(false)
    });
    profileForm.reset();
    await loadProfiles();
    log('Profile deleted');
  } catch (err) {
    log(`Delete profile failed: ${err.message}`, true);
  }
});

projectForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!state.token) {
    log('Please login to create project', true);
    return;
  }

  const formData = new FormData(projectForm);
  const techStack = String(formData.get('techStack') || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const payload = {
    title: formData.get('title'),
    description: formData.get('description'),
    techStack,
    repoLink: formData.get('repoLink')
  };

  try {
    await api('/api/projects', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload)
    });
    projectForm.reset();
    await loadProjects();
    log('Project created');
  } catch (err) {
    log(`Create project failed: ${err.message}`, true);
  }
});

projectsFeed.addEventListener('click', async (e) => {
  const likeBtn = e.target.closest('.like-btn');
  const commentBtn = e.target.closest('.comment-btn');
  const deleteBtn = e.target.closest('.delete-btn');

  if (likeBtn) {
    if (!state.token) {
      log('Please login to like projects', true);
      return;
    }
    const id = likeBtn.dataset.id;
    try {
      await api(`/api/projects/${id}/like`, {
        method: 'PUT',
        headers: authHeaders(false)
      });
      await loadProjects();
      log('Like updated');
    } catch (err) {
      log(`Like failed: ${err.message}`, true);
    }
  }

  if (commentBtn) {
    if (!state.token) {
      log('Please login to comment', true);
      return;
    }

    const id = commentBtn.dataset.id;
    const text = window.prompt('Enter your comment');
    if (!text || !text.trim()) return;

    try {
      await api(`/api/projects/${id}/comments`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ text })
      });
      await loadProjects();
      log('Comment added');
    } catch (err) {
      log(`Comment failed: ${err.message}`, true);
    }
  }

  if (deleteBtn) {
    if (!state.token) {
      log('Please login to delete projects', true);
      return;
    }

    if (!window.confirm('Delete this project?')) return;

    const id = deleteBtn.dataset.id;
    try {
      await api(`/api/projects/${id}`, {
        method: 'DELETE',
        headers: authHeaders(false)
      });
      await loadProjects();
      log('Project deleted');
    } catch (err) {
      log(`Delete failed: ${err.message}`, true);
    }
  }
});

function initRevealAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll('.reveal').forEach((node) => observer.observe(node));
}

async function bootstrap() {
  initRevealAnimations();
  setAuthUI();
  renderMe();
  await Promise.all([loadProjects(), loadProfiles()]);
  await refreshMe();
  log('Frontend ready. Connected to backend API.');
}

bootstrap();
