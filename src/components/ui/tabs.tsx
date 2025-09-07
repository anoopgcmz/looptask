'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { timing } from '@/lib/motion'

const TabsContext = React.createContext<{ value: string | undefined }>({ value: undefined })

function Tabs({ defaultValue, children, ...props }: TabsPrimitive.TabsProps) {
  const [value, setValue] = React.useState<string | undefined>(defaultValue)
  return (
    <TabsContext.Provider value={{ value }}>
      <TabsPrimitive.Root
        value={value}
        onValueChange={setValue}
        {...props}
      >
        {children}
      </TabsPrimitive.Root>
    </TabsContext.Provider>
  )
}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn('relative flex border-b', className)}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, children, value, ...props }, ref) => {
  const { value: current } = React.useContext(TabsContext)
  const active = current !== undefined && current === value
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      value={value}
      className={cn(
        'relative px-3 py-2 text-sm text-muted-foreground transition-colors group',
        'focus:outline-none',
        'data-[state=active]:text-primary',
        className
      )}
      {...props}
    >
      {children}
      {active && (
        <motion.span
          layoutId="tab-indicator"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-current"
          transition={timing.inkBar}
        />
      )}
      <span className="pointer-events-none absolute left-1/2 bottom-0 h-0.5 w-0 -translate-x-1/2 bg-current transition-[width] duration-300 ease-out group-hover:w-full group-data-[state=active]:opacity-0" />
    </TabsPrimitive.Trigger>
  )
})
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, children, value, ...props }, ref) => {
  const { value: current } = React.useContext(TabsContext)
  const active = current !== undefined && current === value
  const prefersReducedMotion = useReducedMotion()
  return (
    <TabsPrimitive.Content
      ref={ref}
      value={value}
      forceMount
      className={cn('mt-4', className)}
      {...props}
    >
      <AnimatePresence mode="popLayout">
        {active && (
          <motion.div
            key={value}
            layout={!prefersReducedMotion}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={timing.inkBar}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </TabsPrimitive.Content>
  )
})
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
