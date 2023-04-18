import Toolkit from '../Toolkit';

// OpenAI API key can optionally be set here, or the underlying model
// will use the environment variable OPENAI_API_KEY
const toolkit = new Toolkit({
  openAIApiKey: '',
  serpApiKey: '',
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
