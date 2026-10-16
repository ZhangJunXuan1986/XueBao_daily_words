/* 内置仿真样题（自编，用于熟悉题型与流程，不替代真题） */
window.BUILTIN_PAPERS = (function () {
  function I(no, type, stem, opts, ans, explain, passage) {
    return {
      id: 'b' + Math.random().toString(36).slice(2, 8), no: no, type: type, stem: stem,
      passage: passage || '',
      options: (opts || []).map(function (v, i) { return { k: 'ABCD'[i], v: v }; }),
      ans: ans || '', explain: explain || ''
    };
  }

  /* ============ 卷一：专升本英语仿真（自编） ============ */
  var p1 = [];
  // 词汇与语法 20 题
  p1.push(I(1, '词汇语法', 'It is high time that we ______ effective measures to reduce pollution.',
    ['take', 'took', 'will take', 'have taken'], 'B',
    'It is (high) time that + 从句，从句谓语用过去式表虚拟语气。'));
  p1.push(I(2, '词汇语法', 'The novel ______ by the young writer has been translated into ten languages.',
    ['writing', 'written', 'to write', 'having written'], 'B',
    'novel 与 write 是被动关系，用过去分词作后置定语。'));
  p1.push(I(3, '词汇语法', 'Not only ______ hard, but he also helped his classmates with their lessons.',
    ['he studied', 'did he study', 'he did study', 'studied he'], 'B',
    'Not only 位于句首引起部分倒装：助动词提到主语前。'));
  p1.push(I(4, '词汇语法', 'If I ______ you, I would accept the offer without hesitation.',
    ['am', 'was', 'were', 'be'], 'C',
    '与现在事实相反的虚拟条件句，be 动词一律用 were。'));
  p1.push(I(5, '词汇语法', 'By the end of last year, the company ______ its sales target twice.',
    ['achieved', 'had achieved', 'has achieved', 'would achieve'], 'B',
    'By the end of + 过去时间，主句用过去完成时。'));
  p1.push(I(6, '词汇语法', 'The manager insisted that the report ______ before Friday.',
    ['was finished', 'be finished', 'would be finished', 'must finish'], 'B',
    'insist 表示“坚持要求”时，宾语从句用 (should) + 动词原形的虚拟语气。'));
  p1.push(I(7, '词汇语法', 'She is the only one of the students who ______ been selected for the contest.',
    ['have', 'has', 'are', 'were'], 'B',
    '先行词被 the only one of 修饰时，定语从句谓语用单数。'));
  p1.push(I(8, '词汇语法', '______ from the top of the hill, the village looks more beautiful.',
    ['Seeing', 'Seen', 'To see', 'Having seen'], 'B',
    'village 与 see 是被动关系，用过去分词作状语。'));
  p1.push(I(9, '词汇语法', 'I look forward to ______ with you on this project.',
    ['work', 'working', 'worked', 'be working'], 'B',
    'look forward to 中 to 是介词，后接动名词。'));
  p1.push(I(10, '词汇语法', 'He spoke ______ quickly that few of us could follow him.',
    ['very', 'so', 'such', 'too'], 'B',
    'so + 副词 + that 引导结果状语从句。'));
  p1.push(I(11, '词汇语法', 'The number of students in our school ______ increased by 20% this year.',
    ['has', 'have', 'are', 'were'], 'A',
    'the number of 作主语时谓语用单数。'));
  p1.push(I(12, '词汇语法', 'It was in this small room ______ he finished his first book.',
    ['where', 'which', 'that', 'when'], 'C',
    '强调句型 It is/was + 被强调部分 + that + 其余部分。'));
  p1.push(I(13, '词汇语法', 'You ______ have told me earlier; now it is too late.',
    ['must', 'should', 'need', 'would'], 'B',
    'should have done 表示“本应该做而没做”。'));
  p1.push(I(14, '词汇语法', 'Hardly ______ the door when the telephone rang.',
    ['I had closed', 'had I closed', 'I closed', 'did I close'], 'B',
    'hardly...when 结构中 hardly 置句首要部分倒装，且主句用过去完成时。'));
  p1.push(I(15, '词汇语法', 'The harder you work, ______ progress you will make.',
    ['the great', 'greater', 'the greater', 'greatest'], 'C',
    'the + 比较级…, the + 比较级… 表示“越…越…”。'));
  p1.push(I(16, '词汇语法', 'We must prevent the river from ______ polluted.',
    ['be', 'being', 'been', 'to be'], 'B',
    'prevent...from doing，被动用 being done。'));
  p1.push(I(17, '词汇语法', 'The reason ______ he was late is that he missed the bus.',
    ['why', 'which', 'that', 'what'], 'A',
    'reason 作先行词且在从句中作原因状语，用 why。'));
  p1.push(I(18, '词汇语法', 'I would rather you ______ anything about it for the time being.',
    ['do', 'did', 'will do', 'have done'], 'B',
    'would rather + 从句，用过去式表对现在/将来的虚拟。'));
  p1.push(I(19, '词汇语法', '______ the bad weather, the sports meeting was put off.',
    ['Because', 'Since', 'Owing to', 'For'], 'C',
    'owing to 后接名词短语表原因；because/since/for 多引导句子。'));
  p1.push(I(20, '词汇语法', 'The teacher asked us ______ so much noise in class.',
    ['not make', 'not to make', 'don’t make', 'to not make'], 'B',
    'ask sb. (not) to do sth. 不定式的否定式为 not to do。'));

  // 完形填空（自编短文 10 空）
  var clozePassage = 'Everyone wants to be successful, but success means different things to different people. Some people think success means having a lot of ___21___, while others believe it means being happy with what they have. In my opinion, success is not a destination but a ___22___. It requires hard work, patience and a clear ___23___. A successful person never gives up when facing difficulties. ___24___, he tries to learn from his failures. He knows that failure is the mother of ___25___. Thomas Edison failed thousands of times before he finally ___26___ the electric light bulb. When asked how he felt about so many failures, he said he had not failed; he had just found thousands of ways that did not ___27___. Another important quality of successful people is that they ___28___ time very well. They set priorities and focus on what really ___29___. If you want to succeed, start by setting small goals and ___30___ them step by step.';
  var cloze = [
    [21, ['time', 'money', 'friends', 'books'], 'B'],
    [22, ['journey', 'result', 'problem', 'gift'], 'A'],
    [23, ['answer', 'goal', 'reason', 'habit'], 'B'],
    [24, ['However', 'Therefore', 'Instead', 'Besides'], 'C'],
    [25, ['success', 'luck', 'health', 'wisdom'], 'A'],
    [26, ['discovered', 'invented', 'found', 'bought'], 'B'],
    [27, ['work', 'matter', 'exist', 'change'], 'A'],
    [28, ['waste', 'kill', 'manage', 'forget'], 'C'],
    [29, ['matters', 'happens', 'appears', 'costs'], 'A'],
    [30, ['forget', 'achieving', 'proving', 'avoiding'], 'B']
  ];
  cloze.forEach(function (c) {
    p1.push(I(c[0], '完形填空', '第 ' + c[0] + ' 空（success 主题短文）', c[1], c[2], '短文大意：成功是一种过程，需要坚持、善败与善用时间。', clozePassage));
  });

  // 阅读理解 2 篇（自编）
  var rp1 = 'In recent years, more and more young people in China have chosen to work in small towns instead of big cities. For them, life in a big city means long working hours, high housing prices and heavy traffic. In a small town, they can find a slower pace of life, lower costs and closer relationships with family and friends. However, small towns also have disadvantages: fewer job opportunities, less cultural activities and limited public services. Experts say young people should think about what they truly want before making a decision.';
  [[31, 'Why do some young people leave big cities?', ['They dislike their jobs.', 'Life pressure in big cities is high.', 'They want to travel abroad.', 'Their parents ask them to.'], 'B'],
  [32, 'What is an advantage of small towns?', ['Better public services.', 'More job chances.', 'Lower living costs.', 'Richer cultural life.'], 'C'],
  [33, 'What does the writer say about small towns?', ['They are perfect for everyone.', 'They have no problems at all.', 'They also have disadvantages.', 'They will replace big cities.'], 'C'],
  [34, 'What do experts advise young people to do?', ['Follow the majority.', 'Think about their real needs.', 'Move back to their hometown.', 'Work harder in big cities.'], 'B'],
  [35, 'The best title for the passage is ______.', ['Youth Choices: Big City or Small Town', 'The History of Chinese Cities', 'How to Find a Good Job', 'Traffic Problems in China'], 'A']].forEach(function (q) {
    p1.push(I(q[0], '阅读理解', q[1], q[2], q[3], '', rp1));
  });

  var rp2 = 'Reading is one of the best habits a person can develop. It not only increases knowledge but also improves concentration and reduces stress. A study shows that reading for just six minutes a day can lower a person’s stress level by more than two thirds. Unlike watching videos, reading requires the brain to work actively, which helps keep the mind sharp. To build a reading habit, experts suggest starting with short articles on topics you enjoy, reading at a fixed time every day, and keeping a notebook for new words and ideas.';
  [[36, 'According to the passage, reading can NOT ______.', ['increase knowledge', 'improve concentration', 'reduce stress', 'cure serious illness'], 'D'],
  [37, 'How long of daily reading can lower stress greatly?', ['Six minutes.', 'Six hours.', 'Sixty minutes.', 'Sixteen minutes.'], 'A'],
  [38, 'Why is reading different from watching videos?', ['It is more relaxing.', 'It makes the brain work actively.', 'It costs less money.', 'It needs no light.'], 'B'],
  [39, 'What is NOT suggested for building a reading habit?', ['Start with interesting short articles.', 'Read at a fixed time daily.', 'Keep a notebook for new words.', 'Only read difficult books.'], 'D'],
  [40, 'The passage mainly tells us ______.', ['how to choose books', 'the benefits of reading and how to start', 'why videos are bad', 'where to buy cheap books'], 'B']].forEach(function (q) {
    p1.push(I(q[0], '阅读理解', q[1], q[2], q[3], '', rp2));
  });

  // 翻译（中译英）
  [['无论遇到什么困难，我们都应该坚持自己的梦想。', 'No matter what difficulties we meet, we should stick to our dreams.'],
  ['只有努力学习，你才能通过这次考试。', 'Only by studying hard can you pass this examination.'],
  ['这本书值得一读，因为它充满了人生智慧。', 'This book is worth reading because it is full of wisdom about life.'],
  ['随着科技的发展，我们的生活方式发生了巨大变化。', 'With the development of technology, great changes have taken place in our way of life.'],
  ['他昨天没来上课，是因为他生病了。', 'He didn’t come to class yesterday because he was ill.']].forEach(function (t, i) {
    p1.push(I(41 + i, '翻译', '汉译英：' + t[0], [], '', '参考译文：' + t[1]));
  });

  p1.push(I(46, '写作', '请以 “The Importance of Lifelong Learning” 为题，写一篇不少于 120 词的英语短文。要点：1) 为什么需要终身学习；2) 你的做法。', [], '', '参考思路：开门见山点题 → 两段展开原因与个人做法 → 总结呼应。注意时态一致与连接词使用。'));

  /* ============ 卷二：四级仿真（自编） ============ */
  var p2 = [];
  [['The government has taken measures to ______ the spread of the disease.', ['prevent', 'pretend', 'present', 'preserve'], 'A', 'prevent 阻止；pretend 假装；present 呈现；preserve 保存。'],
  ['She has a strong ______ for music and practices the piano every day.', ['passion', 'passive', 'patience', 'pattern'], 'A', 'have a passion for 对…有强烈爱好。'],
  ['The results of the experiment were quite ______ from what we had expected.', ['same', 'similar', 'different', 'familiar'], 'C', 'different from 与…不同。'],
  ['It is important to ______ a balance between work and life.', ['keep', 'make', 'take', 'hold'], 'A', 'keep a balance between…and… 保持平衡。'],
  ['He was ______ of cheating in the exam and felt ashamed.', ['accused', 'charged', 'blamed', 'criticized'], 'A', 'be accused of 被指控；charge 搭配 with。'],
  ['The company is trying to ______ costs without lowering quality.', ['reduce', 'reuse', 'recycle', 'rebuild'], 'A', 'reduce costs 降低成本。'],
  ['Many people are ______ about the future of AI technology.', ['optimistic', 'optional', 'opposite', 'ordinary'], 'A', 'be optimistic about 对…乐观。'],
  ['The teacher encouraged students to ______ in class discussions.', ['participate', 'anticipate', 'dominate', 'hesitate'], 'A', 'participate in 参加。'],
  ['A good dictionary is an ______ tool for language learners.', ['indispensable', 'independent', 'inexpensive', 'informal'], 'A', 'indispensable 不可缺少的。'],
  ['We should learn to ______ problems from different angles.', ['approach', 'attach', 'attack', 'arrange'], 'A', 'approach a problem 处理问题。']].forEach(function (q, i) {
    p2.push(I(1 + i, '词汇语法', q[0], q[1], q[2], q[3]));
  });

  var rp3 = 'Online learning has become increasingly popular in higher education. Its biggest advantage is flexibility: students can study at their own pace and review difficult parts as many times as they need. It also makes education available to people in remote areas. However, online learning requires strong self-discipline. Without the face-to-face supervision of a classroom, some students easily lose motivation. Research suggests that a blended model, which combines online materials with occasional in-person meetings, produces the best learning outcomes.';
  [[11, 'What is the main advantage of online learning?', ['Low cost.', 'Flexibility.', 'Better teachers.', 'More homework.'], 'B'],
  [12, 'Who can benefit from online education according to the text?', ['Only top students.', 'People in remote areas.', 'Only city students.', 'Only teachers.'], 'B'],
  [13, 'What does online learning require?', ['Strong self-discipline.', 'Expensive equipment.', 'A large classroom.', 'Daily examinations.'], 'A'],
  [14, 'What is a blended model?', ['Purely online study.', 'Online materials plus some in-person meetings.', 'Traditional classroom only.', 'Learning from TV.'], 'B'],
  [15, 'What is the passage mainly about?', ['The history of education.', 'Advantages and limits of online learning.', 'How to use the Internet.', 'The cost of college.'], 'B']].forEach(function (q) {
    p2.push(I(q[0], '阅读理解', q[1], q[2], q[3], '', rp3));
  });

  var rp4 = 'Sleep is as essential to health as food and water. During sleep, the body repairs itself and the brain organizes memories. Lack of sleep can lead to poor concentration, low spirits and even serious health problems. Experts recommend that adults get seven to nine hours of sleep each night. To improve sleep quality, one should keep a regular schedule, avoid caffeine in the evening and put away electronic devices at least thirty minutes before bed.';
  [[16, 'What does the passage compare sleep to?', ['Exercise and rest.', 'Food and water.', 'Medicine and vitamins.', 'Air and sunlight.'], 'B'],
  [17, 'What happens during sleep?', ['The body stops working.', 'The brain organizes memories.', 'Nothing important.', 'The heart rests completely.'], 'B'],
  [18, 'Lack of sleep may cause ______.', ['better memory', 'poor concentration', 'higher spirits', 'faster growth'], 'B'],
  [19, 'How many hours of sleep do adults need?', ['5-6 hours.', '7-9 hours.', '10-12 hours.', '4-5 hours.'], 'B'],
  [20, 'Which is NOT advised for better sleep?', ['Keeping a regular schedule.', 'Avoiding evening caffeine.', 'Using phones until sleep.', 'Putting away devices before bed.'], 'C']].forEach(function (q) {
    p2.push(I(q[0], '阅读理解', q[1], q[2], q[3], '', rp4));
  });

  [['随着经济的发展，越来越多的家庭拥有了私家车。', 'With the development of the economy, more and more families own private cars.'],
  ['只有团队合作，我们才能按时完成这个项目。', 'Only by working as a team can we finish this project on time.'],
  ['教育不仅传授知识，还塑造人的品格。', 'Education not only imparts knowledge but also shapes one’s character.']].forEach(function (t, i) {
    p2.push(I(21 + i, '翻译', '汉译英：' + t[0], [], '', '参考译文：' + t[1]));
  });

  p2.push(I(24, '写作', 'Directions: For this part, you are allowed 30 minutes to write an essay on the use of short videos among college students. You should write at least 120 words but no more than 180 words.', [], '', '参考结构：现象描述 → 利弊分析 → 个人看法与建议。'));

  /* ============ 卷三：词汇语法专项 30 题（自编） ============ */
  var p3 = [
    ['The committee ______ divided on the issue.', ['is', 'are', 'was being', 'has'], 'B', 'committee 强调成员时用复数。'],
    ['I can’t get used to ______ up so early.', ['get', 'getting', 'got', 'have got'], 'B', 'get used to doing 习惯于…'],
    ['______ he is poor, he is always ready to help others.', ['Although', 'Because', 'Since', 'As'], 'A', '让步状语从句用 although。'],
    ['This is the factory ______ my father worked ten years ago.', ['that', 'which', 'where', 'when'], 'C', '先行词 factory 在从句中作地点状语，用 where。'],
    ['He denied ______ the money.', ['to take', 'taking', 'take', 'taken'], 'B', 'deny doing 否认做过。'],
    ['No sooner ______ home than it began to rain.', ['I got', 'did I get', 'had I got', 'I had got'], 'C', 'no sooner...than 句首倒装，主句用过去完成时。'],
    ['The book is ______ difficult for beginners ______ understand.', ['so; that', 'too; to', 'very; to', 'enough; to'], 'B', 'too...to 太…而不能。'],
    ['Let’s go for a walk, ______?', ['will we', 'shall we', 'do we', 'are we'], 'B', 'Let’s 开头的反意疑问句用 shall we。'],
    ['If it ______ tomorrow, we will stay at home.', ['rains', 'will rain', 'rained', 'is raining'], 'A', '主将从现：条件状语从句用一般现在时表将来。'],
    ['She suggested that the meeting ______ postponed.', ['is', 'was', 'be', 'would be'], 'C', 'suggest 后从句用 (should) + 原形。'],
    ['______ is known to all, China is developing rapidly.', ['That', 'Which', 'As', 'It'], 'C', 'as 引导非限定性定语从句，可置于句首。'],
    ['He is ______ of the two boys.', ['taller', 'the taller', 'tallest', 'the tallest'], 'B', '两者比较用 the + 比较级。'],
    ['I have two pens; one is blue, ______ is black.', ['another', 'other', 'the other', 'others'], 'C', '两者中的另一个用 the other。'],
    ['The problem is worth ______ carefully.', ['to consider', 'considering', 'considered', 'consider'], 'B', 'be worth doing 值得被做。'],
    ['It ______ five years since he left the company.', ['is', 'was', 'has been', 'had been'], 'C', 'It has been + 时间段 + since 从句。'],
    ['You’d better ______ your homework before watching TV.', ['finish', 'to finish', 'finishing', 'finished'], 'A', 'had better do sth.'],
    ['I wish I ______ the answer now.', ['know', 'knew', 'known', 'will know'], 'B', 'wish 对现在的虚拟用过去式。'],
    ['The students are looking forward to ______ their teacher again.', ['see', 'saw', 'seeing', 'be seen'], 'C', 'look forward to doing。'],
    ['______ tired he was, he kept working.', ['However', 'Whatever', 'Whenever', 'Wherever'], 'A', 'however + 形容词 = 无论多么…'],
    ['The house ______ roof was damaged has been repaired.', ['which', 'that', 'whose', 'of which'], 'C', 'whose 引导定语从句表所属。'],
    ['It is no use ______ over spilt milk.', ['cry', 'to cry', 'crying', 'cried'], 'C', 'It is no use doing 做某事无用。'],
    ['Not until midnight ______ working.', ['he stopped', 'did he stop', 'he did stop', 'stopped he'], 'B', 'not until 置句首引起部分倒装。'],
    ['The price of oil ______ sharply in the past few months.', ['rose', 'has risen', 'is rising', 'had risen'], 'B', 'in the past + 时间段，用现在完成时。'],
    ['I prefer reading books ______ watching TV.', ['than', 'to', 'rather', 'instead'], 'B', 'prefer doing A to doing B。'],
    ['The teacher, as well as his students, ______ invited to the party.', ['was', 'were', 'are', 'have been'], 'A', 'as well as 连接主语时谓语随前面的名词。'],
    ['He apologized ______ being late.', ['for', 'to', 'with', 'about'], 'A', 'apologize for doing。'],
    ['It is the third time that she ______ the prize.', ['wins', 'won', 'has won', 'had won'], 'C', 'It is the + 序数词 + time that 从句用现在完成时。'],
    ['______ careful you are, ______ mistakes you will make.', ['The more; the fewer', 'The more; the less', 'More; fewer', 'The much; the few'], 'A', 'the + 比较级…, the + 比较级…；mistakes 可数用 fewer。'],
    ['The meeting ______ next week is very important.', ['held', 'being held', 'to be held', 'holding'], 'C', '将来被动用 to be done 作定语。'],
    ['I ______ my homework when the lights went out.', ['did', 'was doing', 'had done', 'would do'], 'B', '过去某一时刻正在进行的动作用过去进行时。']
  ].map(function (q, i) {
    return I(i + 1, '词汇语法', q[0], q[1], q[2], q[3]);
  });

  return [
    { id: 'p_zsb_demo', name: '专升本英语 · 仿真样题（自编）', src: '专升本', items: p1 },
    { id: 'p_cet4_demo', name: '英语四级 · 仿真样题（自编）', src: '四级', items: p2 },
    { id: 'p_grammar_demo', name: '词汇语法专项 30 题（自编）', src: '专项', items: p3 }
  ];
})();
