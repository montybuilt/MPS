# Coding Terminal
def check_pos(num):
  assert isinstance(num, int) or isinstance(num, float)
  assert num > 0
  return 'Valid'