export const config = {
  postsPerSubreddit: 50,
  commentsPerPost: 10,
  delayBetweenRequests: 1500, // ms
  defaultSubreddits: {
    generic: [
      'programming',
      'learnprogramming',
      'coding',
      'softwareengineering',
      'dailyprogrammer',
      'AskProgramming',
      'ExperiencedDevs',
      'SideProject',
      'codereview',
    ],
    itcareers: [
      'cscareerquestions',
      'itcareerquestions',
      'startups',
      'ProgrammerHumor',
      'technology',
    ],
    ai: [
      'MachineLearning',
      'Artificial',
      'LearnMachineLearning',
      'deeplearning',
      'QuantumComputing',
      'LanguageTechnology'
    ],
    security: [
      'netsec',
      'CyberSecurity',
      'Hacking',
    ],
    javascript: [
      'reactjs',
      'nextjs',
      'vuejs',
      'sveltejs',
      'Angular2',
      'javascript',
      'learnjavascript',
    ]
  }
} as const;
