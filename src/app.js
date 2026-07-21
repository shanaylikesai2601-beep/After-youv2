// Basic Express server for project filtering and search
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Sample in-memory projects data (to be replaced with real data source)
const projects = [
  {
    title: 'Project One',
    description: 'A brief description of project one.',
    image: 'https://via.placeholder.com/300x150',
    link: '#',
    tags: ['Web', 'Frontend']
  },
  {
    title: 'Project Two',
    description: 'A brief description of project two.',
    image: 'https://via.placeholder.com/300x150',
    link: '#',
    tags: ['Mobile', 'Backend']
  },
  {
    title: 'Project Three',
    description: 'A brief description of project three.',
    image: 'https://via.placeholder.com/300x150',
    link: '#',
    tags: ['Data Science', 'Python']
  }
];

// Helper to filter projects based on search keyword and tags
function filterProjects({ search = '', tags = '' }) {
  const tagArray = tags ? tags.split(',').map(t => t.trim().toLowerCase()) : [];
  const keyword = search.trim().toLowerCase();
  return projects.filter(p => {
    const matchesSearch = !keyword || p.title.toLowerCase().includes(keyword) || p.description.toLowerCase().includes(keyword);
    const matchesTags = tagArray.length === 0 || tagArray.every(t => p.tags.map(pt => pt.toLowerCase()).includes(t));
    return matchesSearch && matchesTags;
  });
}

app.get('/api/projects', (req, res) => {
  const { search, tags } = req.query;
  const result = filterProjects({ search, tags });
  res.json(result);
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

module.exports = app;
