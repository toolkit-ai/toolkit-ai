import Toolkit from '../Toolkit';

// OpenAI API key can optionally be set here, or the underlying model
// will use the environment variable OPENAI_API_KEY
const toolkit = new Toolkit({
  openAIApiKey: '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',
  serpApiKey:
    '530bed4629ff547fc55311c4928791a9abb9cf145908b9f100896e6cc80f02d2',
  logToConsole: true,
});

(async () => {
  const tool = await toolkit.generateTool(
    {
      name: 'Temperature Converter',
      description:
        'Converts a temperature from Farenheit, Celsius, or Kelvin to any other unit.',
    },
    true
  );

  // eslint-disable-next-line no-console
  console.log(tool.langChainCode);
})();
