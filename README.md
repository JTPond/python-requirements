# python-requirements package

Find all top level imports in a python project and produce a requirements.txt

Searches all .py file in the first project folder.

Stops looking for imports when it finds a non-empty, non-comment line that does not start with 'import', or 'from'.

Has logic to *not* include local modules or python standard modules from [here](https://docs.python.org/3.7/py-modindex.html "Python 3.7 module index").

Does not support multiple comma separated imports on the same line, but this is against [PEP](https://www.python.org/dev/peps/pep-0008/#imports "PEP8-imports") anyway. 
